package docker

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/docker/docker/pkg/stdcopy"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"docker-crafter/internal/config"
	"docker-crafter/internal/logger"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/client"
)

type dockerService struct {
	clients         map[string]*client.Client
	statsMap        map[string]ContainerStats // container ID -> Stats
	statsMutex      sync.RWMutex
	lastRequestTime time.Time
	wsCount         int
	reqMutex        sync.Mutex
	wakeupChan      chan struct{}
	eventsChan      chan DockerEvent
	ctx             context.Context
	cancel          context.CancelFunc
	wg              sync.WaitGroup
}

// NewService initializes a new multi-engine Docker service.
func NewService(configs []config.DockerEngineConfig) (ContainerManager, error) {
	ctx, cancel := context.WithCancel(context.Background())
	s := &dockerService{
		clients:         make(map[string]*client.Client),
		statsMap:        make(map[string]ContainerStats),
		wakeupChan:      make(chan struct{}, 1),
		eventsChan:      make(chan DockerEvent, 100),
		ctx:             ctx,
		cancel:          cancel,
		lastRequestTime: time.Now(),
	}

	for _, cfg := range configs {
		var cli *client.Client
		var err error

		opts := []client.Opt{
			client.WithAPIVersionNegotiation(),
		}

		if cfg.Host == "" {
			// Local engine
			opts = append(opts, client.FromEnv)
		} else {
			// Remote engine
			opts = append(opts, client.WithHost(cfg.Host))

			if cfg.TLSVerify {
				tlsConfig, tlsErr := s.buildTLSConfig(cfg)
				if tlsErr != nil {
					logger.Warnf("Failed to build TLS config for engine %s: %v", cfg.Name, tlsErr)
					continue
				}
				httpClient := &http.Client{
					Transport: &http.Transport{
						TLSClientConfig: tlsConfig,
					},
				}
				opts = append(opts, client.WithHTTPClient(httpClient))
			}
		}

		cli, err = client.NewClientWithOpts(opts...)
		if err != nil {
			logger.Warnf("Failed to connect to engine %s: %v", cfg.Name, err)
			continue
		}

		// Ping to verify connection
		pingCtx, pingCancel := context.WithTimeout(ctx, 3*time.Second)
		_, err = cli.Ping(pingCtx)
		pingCancel()
		if err != nil {
			logger.Warnf("Failed to ping engine %s: %v", cfg.Name, err)
			continue
		}

		s.clients[cfg.Name] = cli
		logger.Infof("Successfully connected to Docker engine: %s", cfg.Name)
	}

	if len(s.clients) == 0 {
		return nil, fmt.Errorf("failed to connect to any docker engine")
	}

	// Start stats manager
	s.wg.Add(1)
	go s.statsManager()

	// Start event listeners
	for name, cli := range s.clients {
		s.wg.Add(1)
		go s.eventListener(name, cli)
	}

	return s, nil
}

func (s *dockerService) buildTLSConfig(cfg config.DockerEngineConfig) (*tls.Config, error) {
	tlsConfig := &tls.Config{}
	pool := x509.NewCertPool()

	if cfg.CertPath != "" {
		caPath := filepath.Join(cfg.CertPath, "ca.pem")
		certPath := filepath.Join(cfg.CertPath, "cert.pem")
		keyPath := filepath.Join(cfg.CertPath, "key.pem")

		caCert, err := os.ReadFile(caPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read ca cert: %w", err)
		}
		pool.AppendCertsFromPEM(caCert)

		cert, err := tls.LoadX509KeyPair(certPath, keyPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read client cert/key: %w", err)
		}
		tlsConfig.Certificates = []tls.Certificate{cert}

	} else if cfg.CACertBase64 != "" {
		caCert, err := base64.StdEncoding.DecodeString(cfg.CACertBase64)
		if err != nil {
			return nil, fmt.Errorf("failed to decode ca cert base64: %w", err)
		}
		pool.AppendCertsFromPEM(caCert)

		if cfg.ClientCertBase64 != "" && cfg.ClientKeyBase64 != "" {
			certPEM, err := base64.StdEncoding.DecodeString(cfg.ClientCertBase64)
			if err != nil {
				return nil, fmt.Errorf("failed to decode client cert base64: %w", err)
			}
			keyPEM, err := base64.StdEncoding.DecodeString(cfg.ClientKeyBase64)
			if err != nil {
				return nil, fmt.Errorf("failed to decode client key base64: %w", err)
			}

			cert, err := tls.X509KeyPair(certPEM, keyPEM)
			if err != nil {
				return nil, fmt.Errorf("failed to parse client cert/key: %w", err)
			}
			tlsConfig.Certificates = []tls.Certificate{cert}
		}
	} else {
		return nil, fmt.Errorf("tls_verify is true but neither cert_path nor base64 certs are provided")
	}

	tlsConfig.RootCAs = pool
	return tlsConfig, nil
}

func (s *dockerService) UpdateLastRequestTime() {
	s.reqMutex.Lock()
	s.lastRequestTime = time.Now()
	s.reqMutex.Unlock()
}

func (s *dockerService) IncWSCount() {
	s.reqMutex.Lock()
	s.wsCount++
	s.reqMutex.Unlock()
}

func (s *dockerService) DecWSCount() {
	s.reqMutex.Lock()
	if s.wsCount > 0 {
		s.wsCount--
	}
	s.reqMutex.Unlock()
}

func (s *dockerService) wakeUpStats() {
	select {
	case s.wakeupChan <- struct{}{}:
	default:
	}
}

type preStats struct {
	cpuUsage    uint64
	systemUsage uint64
}

func (s *dockerService) statsManager() {
	defer s.wg.Done()

	// Pre-calculate to avoid nil map issues if previous stats are missing.
	// Actually we should store previous stats locally per container to calculate delta properly.
	prevStatsMap := make(map[string]preStats)

	timer := time.NewTimer(0) // Run immediately

	for {
		select {
		case <-s.ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			// Drain wakeupChan if there was a pending signal so we don't immediately double-run
			select {
			case <-s.wakeupChan:
			default:
			}

			s.collectStats(prevStatsMap)

			s.reqMutex.Lock()
			active := s.wsCount > 0 || time.Since(s.lastRequestTime) < 5*time.Second
			s.reqMutex.Unlock()

			interval := 15 * time.Second
			if active {
				interval = 2 * time.Second
			}
			timer.Reset(interval)

		case <-s.wakeupChan:
			// Immediate run
			if !timer.Stop() {
				// If timer already expired, drain the channel
				select {
				case <-timer.C:
				default:
				}
			}
			s.collectStats(prevStatsMap)

			s.reqMutex.Lock()
			active := s.wsCount > 0 || time.Since(s.lastRequestTime) < 5*time.Second
			s.reqMutex.Unlock()

			interval := 15 * time.Second
			if active {
				interval = 2 * time.Second
			}
			timer.Reset(interval)
		}
	}
}

func (s *dockerService) collectStats(_ map[string]preStats) {
	ctx, cancel := context.WithTimeout(s.ctx, 10*time.Second)
	defer cancel()

	var wg sync.WaitGroup
	var mu sync.Mutex
	newStats := make(map[string]ContainerStats)
	runningContainers := make(map[string]bool)

	for _, cli := range s.clients {
		containers, err := cli.ContainerList(ctx, container.ListOptions{}) // Only running
		if err != nil {
			continue
		}

		for _, c := range containers {
			wg.Add(1)
			go func(cID string, cli *client.Client) {
				defer wg.Done()

				statsResp, err := cli.ContainerStats(ctx, cID, false)
				if err != nil {
					return
				}
				defer statsResp.Body.Close()

				body, err := io.ReadAll(statsResp.Body)
				if err != nil {
					return
				}

				var v container.StatsResponse
				if err := json.Unmarshal(body, &v); err != nil {
					return
				}

				// Calculate CPU %
				var cpuPercent float64
				cpuDelta := float64(v.CPUStats.CPUUsage.TotalUsage) - float64(v.PreCPUStats.CPUUsage.TotalUsage)
				systemDelta := float64(v.CPUStats.SystemUsage) - float64(v.PreCPUStats.SystemUsage)
				onlineCPUs := float64(v.CPUStats.OnlineCPUs)
				if onlineCPUs == 0.0 {
					onlineCPUs = float64(len(v.CPUStats.CPUUsage.PercpuUsage))
				}
				if systemDelta > 0.0 && cpuDelta > 0.0 {
					cpuPercent = (cpuDelta / systemDelta) * onlineCPUs * 100.0
				}

				// Calculate Memory
				var cache float64
				if c, ok := v.MemoryStats.Stats["inactive_file"]; ok {
					cache = float64(c)
				} else if c, ok := v.MemoryStats.Stats["cache"]; ok {
					cache = float64(c)
				}

				memUsage := float64(v.MemoryStats.Usage) - cache
				if memUsage < 0 {
					memUsage = 0
				}
				memLimit := float64(v.MemoryStats.Limit)

				mu.Lock()
				newStats[cID] = ContainerStats{
					CpuUsage:    cpuPercent,
					MemoryUsage: int64(memUsage),
					MemoryLimit: int64(memLimit),
				}
				runningContainers[cID] = true
				mu.Unlock()

			}(c.ID, cli)
		}
	}

	wg.Wait()

	// Update the shared map safely
	s.statsMutex.Lock()
	for k, v := range newStats {
		s.statsMap[k] = v
	}
	// Cleanup stopped containers
	for k := range s.statsMap {
		if !runningContainers[k] {
			delete(s.statsMap, k)
		}
	}
	s.statsMutex.Unlock()
}

func (s *dockerService) eventListener(engineName string, cli *client.Client) {
	defer s.wg.Done()

	for {
		if s.ctx.Err() != nil {
			return
		}

		msgChan, errChan := cli.Events(s.ctx, events.ListOptions{})
		logger.Infof("Started Docker event listener for engine %s", engineName)

	listenLoop:
		for {
			select {
			case <-s.ctx.Done():
				return
			case err := <-errChan:
				if err != nil && err != io.EOF {
					logger.Warnf("Event listener error for engine %s: %v", engineName, err)
				}
				break listenLoop // Reconnect
			case msg := <-msgChan:
				if msg.Type == events.ContainerEventType {
					switch msg.Action {
					case events.Action("start"), events.Action("stop"), events.Action("die"), events.Action("destroy"), events.Action("pause"), events.Action("unpause"), events.Action("rename"):
						s.wakeUpStats()
						evt := DockerEvent{
							Action:     string(msg.Action),
							ActorID:    msg.Actor.ID,
							EngineName: engineName,
						}
						select {
						case s.eventsChan <- evt:
						default:
							// Drop if channel is full
						}
					}
				}
			}
		}

		// Wait 5 seconds before reconnecting
		select {
		case <-s.ctx.Done():
			return
		case <-time.After(5 * time.Second):
		}
	}
}

func (s *dockerService) GetContainers(ctx context.Context) ([]ContainerInfo, error) {
	var allContainers []ContainerInfo
	var mu sync.Mutex
	var wg sync.WaitGroup

	reqCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	for engName, cli := range s.clients {
		wg.Add(1)
		go func(name string, client *client.Client) {
			defer wg.Done()
			containers, err := client.ContainerList(reqCtx, container.ListOptions{All: true})
			if err != nil {
				logger.Warnf("Failed to get containers from engine %s: %v", name, err)
				return
			}

			s.statsMutex.RLock()
			for _, c := range containers {
				cName := ""
				if len(c.Names) > 0 {
					cName = strings.TrimPrefix(c.Names[0], "/")
				}

				stats := s.statsMap[c.ID]

				info := ContainerInfo{
					ID:          c.ID,
					Name:        cName,
					Image:       c.Image,
					State:       c.State,
					Status:      c.Status,
					Labels:      c.Labels,
					CpuUsage:    stats.CpuUsage,
					MemoryUsage: stats.MemoryUsage,
					MemoryLimit: stats.MemoryLimit,
				}

				mu.Lock()
				allContainers = append(allContainers, info)
				mu.Unlock()
			}
			s.statsMutex.RUnlock()
		}(engName, cli)
	}

	wg.Wait()
	return allContainers, nil
}

func (s *dockerService) PerformAction(ctx context.Context, action string, ids []string) (*ContainerActionResults, error) {
	results := &ContainerActionResults{
		Successful: make([]string, 0),
		Failed:     make([]ActionError, 0),
	}

	for _, id := range ids {
		err := s.ContainerAction(ctx, id, action)
		if err != nil {
			results.Failed = append(results.Failed, ActionError{
				ContainerID: id,
				Error:       err.Error(),
			})
		} else {
			results.Successful = append(results.Successful, id)
		}
	}

	return results, nil
}

func (s *dockerService) GetProjectWorkspaces(ctx context.Context) ([]ProjectWorkspace, error) {
	var mu sync.Mutex
	var wg sync.WaitGroup

	reqCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	projectMap := make(map[string]*ProjectWorkspace)

	for engName, cli := range s.clients {
		wg.Add(1)
		go func(name string, client *client.Client) {
			defer wg.Done()
			containers, err := client.ContainerList(reqCtx, container.ListOptions{All: true})
			if err != nil {
				logger.Warnf("Failed to get containers from engine %s: %v", name, err)
				return
			}

			s.statsMutex.RLock()
			for _, c := range containers {
				cName := ""
				if len(c.Names) > 0 {
					cName = strings.TrimPrefix(c.Names[0], "/")
				}

				stats := s.statsMap[c.ID]

				info := ContainerInfo{
					ID:          c.ID,
					Name:        cName,
					Image:       c.Image,
					State:       c.State,
					Status:      c.Status,
					Labels:      c.Labels,
					CpuUsage:    stats.CpuUsage,
					MemoryUsage: stats.MemoryUsage,
					MemoryLimit: stats.MemoryLimit,
				}

				projectName := "独立容器（未归组）"
				isCompose := false
				if proj, ok := c.Labels["com.docker.compose.project"]; ok && proj != "" {
					projectName = proj
					isCompose = true
				}

				// Use a composite key because different engines might have projects with the same name
				key := fmt.Sprintf("%s|%s", name, projectName)

				mu.Lock()
				if ws, ok := projectMap[key]; ok {
					ws.Containers = append(ws.Containers, info)
				} else {
					projectMap[key] = &ProjectWorkspace{
						ProjectName: projectName,
						IsCompose:   isCompose,
						Containers:  []ContainerInfo{info},
						EngineName:  name,
					}
				}
				mu.Unlock()
			}
			s.statsMutex.RUnlock()
		}(engName, cli)
	}

	wg.Wait()

	var workspaces []ProjectWorkspace
	for _, ws := range projectMap {
		workspaces = append(workspaces, *ws)
	}

	return workspaces, nil
}

func (s *dockerService) ContainerAction(ctx context.Context, id string, action string) error {
	var targetCli *client.Client

	// Find the container across all engines
	for _, cli := range s.clients {
		_, err := cli.ContainerInspect(ctx, id)
		if err == nil {
			targetCli = cli
			break
		}
	}

	if targetCli == nil {
		return fmt.Errorf("container %s not found on any connected engine", id)
	}

	switch action {
	case "start":
		return targetCli.ContainerStart(ctx, id, container.StartOptions{})
	case "stop":
		return targetCli.ContainerStop(ctx, id, container.StopOptions{})
	case "restart":
		return targetCli.ContainerRestart(ctx, id, container.StopOptions{})
	default:
		return fmt.Errorf("invalid action: %s", action)
	}
}

func (s *dockerService) GetContainerLogs(ctx context.Context, id string, tail string) (string, error) {
	for _, cli := range s.clients {
		inspect, err := cli.ContainerInspect(ctx, id)
		if err != nil {
			continue // Not on this engine
		}

		reader, err := cli.ContainerLogs(ctx, id, container.LogsOptions{
			ShowStdout: true,
			ShowStderr: true,
			Tail:       tail,
			Timestamps: false,
		})
		if err != nil {
			return "", err
		}
		defer reader.Close()

		if inspect.Config.Tty {
			// TTY mode: simple read
			buf := new(bytes.Buffer)
			_, err = io.Copy(buf, reader)
			if err != nil && err != io.EOF {
				return "", err
			}
			return buf.String(), nil
		} else {
			// Non-TTY mode: stdcopy
			var stdoutBuf, stderrBuf bytes.Buffer
			_, err = stdcopy.StdCopy(&stdoutBuf, &stderrBuf, reader)
			if err != nil && err != io.EOF {
				return "", err
			}

			result := stdoutBuf.String()
			stderrStr := stderrBuf.String()
			if stderrStr != "" {
				if result != "" {
					result += "\n--- STDERR ---\n" + stderrStr
				} else {
					result = stderrStr
				}
			}
			return result, nil
		}
	}
	return "", fmt.Errorf("container %s not found on any connected engine", id)
}

func (s *dockerService) ContainerExec(ctx context.Context, id string, cmd []string) (stdout string, stderr string, exitCode int, err error) {
	return "", "", 0, fmt.Errorf("not implemented")
}

// LogMessage represents a line of log in WebSocket stream
type LogMessage struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

// WSWriter wraps a WebSocketWriter to implement io.Writer
type WSWriter struct {
	conn       WebSocketWriter
	streamType string
}

func (w *WSWriter) Write(p []byte) (n int, err error) {
	// Strip trailing newlines
	dataStr := string(p)
	dataStr = strings.TrimRight(dataStr, "\r\n")

	msg := LogMessage{Type: w.streamType, Data: dataStr}
	jsonMsg, err := json.Marshal(msg)
	if err != nil {
		return 0, err
	}

	// 1 = TextMessage (websocket.TextMessage)
	err = w.conn.WriteMessage(1, jsonMsg)
	if err != nil {
		return 0, err
	}
	return len(p), nil
}

func (s *dockerService) StreamContainerLogs(ctx context.Context, id string, tail string, ws WebSocketWriter) error {
	s.reqMutex.Lock()
	s.wsCount++
	s.reqMutex.Unlock()

	defer func() {
		s.reqMutex.Lock()
		s.wsCount--
		s.reqMutex.Unlock()
	}()

	for _, cli := range s.clients {
		inspect, err := cli.ContainerInspect(ctx, id)
		if err != nil {
			continue // Not on this engine
		}

		reader, err := cli.ContainerLogs(ctx, id, container.LogsOptions{
			ShowStdout: true,
			ShowStderr: true,
			Tail:       tail,
			Follow:     true,
			Timestamps: false,
		})
		if err != nil {
			return err
		}
		defer reader.Close()

		go func() {
			<-ctx.Done()
			reader.Close()
		}()

		if inspect.Config.Tty {
			// TTY mode
			buf := make([]byte, 4096)
			for {
				n, err := reader.Read(buf)
				if n > 0 {
					dataStr := string(buf[:n])
					dataStr = strings.TrimRight(dataStr, "\r\n")

					msg := LogMessage{Type: "stdout", Data: dataStr}
					jsonMsg, _ := json.Marshal(msg)
					if writeErr := ws.WriteMessage(1, jsonMsg); writeErr != nil {
						return writeErr
					}
				}
				if err != nil {
					if err == io.EOF {
						return nil
					}
					return err
				}
			}
		} else {
			// Non-TTY mode
			stdoutWriter := &WSWriter{conn: ws, streamType: "stdout"}
			stderrWriter := &WSWriter{conn: ws, streamType: "stderr"}
			_, err = stdcopy.StdCopy(stdoutWriter, stderrWriter, reader)
			if err != nil && err != io.EOF {
				return err
			}
			return nil
		}
	}
	return fmt.Errorf("container %s not found on any connected engine", id)
}

func (s *dockerService) StreamTerminal(ctx context.Context, id string, shell string, ws WebSocketConn) error {
	return fmt.Errorf("not implemented")
}

func (s *dockerService) SubscribeEvents() <-chan DockerEvent {
	return s.eventsChan
}

func (s *dockerService) Close() {
	s.cancel()
	s.wg.Wait()
	for _, cli := range s.clients {
		cli.Close()
	}
}
