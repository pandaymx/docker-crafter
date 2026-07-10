package docker

import (
	"context"
	"time"
)

// ContainerStats represents real-time performance metrics of a container.
type ContainerStats struct {
	CpuUsage    float64 `json:"cpuUsage"`    // Percentage 0-100
	MemoryUsage int64   `json:"memoryUsage"` // Bytes
	MemoryLimit int64   `json:"memoryLimit"` // Bytes
}

// ContainerInfo represents the structured information for a Docker container including real-time metrics.
type ContainerInfo struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Image       string            `json:"image"`
	State       string            `json:"state"`  // running, exited
	Status      string            `json:"status"` // "Up 2 hours", "health: healthy"
	Ports       []string          `json:"ports,omitempty"`
	Labels      map[string]string `json:"labels"`
	CpuUsage    float64           `json:"cpuUsage"`
	MemoryUsage int64             `json:"memoryUsage"`
	MemoryLimit int64             `json:"memoryLimit"`
}

// ProjectWorkspace represents an aggregated container dashboard by project dimension.
type ProjectWorkspace struct {
	ProjectName string          `json:"projectName"`
	IsCompose   bool            `json:"isCompose"`
	Containers  []ContainerInfo `json:"containers"`
	EngineName  string          `json:"engineName"` // The name of the Docker engine
}

// DockerEvent represents a container lifecycle event.
type DockerEvent struct {
	Action     string `json:"action"`     // start, stop, die, destroy, pause, unpause, rename
	ActorID    string `json:"actorId"`    // Container ID
	EngineName string `json:"engineName"` // The name of the Docker engine
}

// ActionError represents an error that occurred during a container action.
type ActionError struct {
	ContainerID string `json:"container_id"`
	Error       string `json:"error"`
}

// ContainerActionResults contains the results of a batch container action.
type ContainerActionResults struct {
	Successful []string      `json:"successful"`
	Failed     []ActionError `json:"failed"`
}

// ContainerManager defines all methods required by the Docker client.
type ContainerManager interface {
	// Existing methods (keeping compatibility)
	GetContainers(ctx context.Context) ([]ContainerInfo, error)
	PerformAction(ctx context.Context, action string, ids []string) (*ContainerActionResults, error)

	// New methods
	GetProjectWorkspaces(ctx context.Context) ([]ProjectWorkspace, error)
	ContainerAction(ctx context.Context, id string, action string) error
	GetContainerLogs(ctx context.Context, id string, tail string) (string, error)
	ContainerExec(ctx context.Context, id string, cmd []string) (stdout string, stderr string, exitCode int, err error)
	StreamContainerLogs(ctx context.Context, id string, tail string, ws WebSocketWriter) error
	StreamTerminal(ctx context.Context, id string, shell string, ws WebSocketConn) error
	SubscribeEvents() <-chan DockerEvent
	Close()
}

// WebSocketWriter defines WebSocket writing capability (used for log streams).
type WebSocketWriter interface {
	WriteMessage(messageType int, data []byte) error
}

// WebSocketConn defines bidirectional WebSocket communication capability (used for terminals).
type WebSocketConn interface {
	WriteMessage(messageType int, data []byte) error
	WriteControl(messageType int, data []byte, deadline time.Time) error
	ReadMessage() (messageType int, p []byte, err error)
	Close() error
}
