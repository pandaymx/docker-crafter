package server

import (
	"context"
	"docker-crafter/internal/config"
	"docker-crafter/internal/db"
	"docker-crafter/internal/docker"
	"docker-crafter/internal/logger"
	"docker-crafter/internal/middleware"
	"docker-crafter/internal/ui"
	"docker-crafter/internal/ws"
	"fmt"
	"io/fs"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/secure"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func startKeepAlive(ctx context.Context, conn *websocket.Conn) (context.Context, context.CancelFunc) {
	ctx, cancel := context.WithCancel(ctx)
	conn.SetReadDeadline(time.Now().Add(40 * time.Second))
	conn.SetPongHandler(func(appData string) error {
		conn.SetReadDeadline(time.Now().Add(40 * time.Second))
		return nil
	})
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(10*time.Second)); err != nil {
					cancel()
					return
				}
			}
		}
	}()
	return ctx, cancel
}

func mustSubFS(f fs.FS, dir string) fs.FS {
	sub, err := fs.Sub(f, dir)
	if err != nil {
		// Assets folder might not exist in the placeholder dist
		// We return the root if that's the case to prevent crashing
		return f
	}
	return sub
}

func serveIfExists(r *gin.Engine, f fs.FS, httpFS http.FileSystem, path string) {
	if _, err := fs.Stat(f, strings.TrimPrefix(path, "/")); err == nil {
		r.StaticFileFS(path, path, httpFS)
	}
}

func NewHTTPServer(cfg *config.Config) (*http.Server, error) {
	logger.SetLevel(cfg.LogLevel)

	_, err := db.NewDB(cfg.DBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %v", err)
	}
	logger.Infof("Successfully connected to SQLite database at %s", cfg.DBPath)

	r := gin.Default()

	if cfg.CORS.AllowOrigin != "" {
		r.Use(middleware.CORSMiddleware(cfg.CORS))
	}

	// Apply basic security headers middleware
	r.Use(secure.New(secure.Config{
		BrowserXssFilter:      true,
		ContentTypeNosniff:    true,
		FrameDeny:             true,
		STSSeconds:            31536000,
		STSIncludeSubdomains:  true,
		ContentSecurityPolicy: "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;",
	}))

	// Initialize Docker service
	dockerService, err := docker.NewService(cfg.DockerEngines)
	if err != nil {
		// Log the error but don't crash, as we want to gracefully degrade if Docker is missing
		logger.Warnf("Warning: Failed to initialize Docker service: %v", err)
	}

	// Activity tracker middleware for docker endpoints
	activityTracker := func(c *gin.Context) {
		if ds, ok := dockerService.(interface{ UpdateLastRequestTime() }); ok {
			ds.UpdateLastRequestTime()
		}
		c.Next()
	}

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	api := r.Group("/api/v1")
	{
		api.GET("/containers", activityTracker, func(c *gin.Context) {
			if dockerService == nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Docker service is not initialized",
				})
				return
			}

			response, err := dockerService.GetContainers(c.Request.Context())
			if err != nil {
				logger.Errorf("Failed to get containers: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, response)
		})

		api.POST("/containers/action", activityTracker, func(c *gin.Context) {
			if dockerService == nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Docker service is not initialized",
				})
				return
			}

			var req struct {
				Action       string   `json:"action" binding:"required"`
				ContainerIDs []string `json:"container_ids" binding:"required"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			response, err := dockerService.PerformAction(c.Request.Context(), req.Action, req.ContainerIDs)
			if err != nil {
				logger.Errorf("Failed to perform action: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, response)
		})

		api.POST("/containers/:id/action", activityTracker, func(c *gin.Context) {
			if dockerService == nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Docker service is not initialized",
				})
				return
			}

			id := c.Param("id")
			var req struct {
				Action string `json:"action" binding:"required"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			err = dockerService.ContainerAction(c.Request.Context(), id, req.Action)
			if err != nil {
				logger.Errorf("Failed to perform action on container %s: %v", id, err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{"message": "Action performed successfully"})
		})

		api.POST("/containers/:id/exec", activityTracker, func(c *gin.Context) {
			if dockerService == nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker service is not initialized"})
				return
			}

			id := c.Param("id")
			var req struct {
				Cmd []string `json:"cmd"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			stdout, stderr, exitCode, err := dockerService.ContainerExec(c.Request.Context(), id, req.Cmd)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"stdout":   stdout,
				"stderr":   stderr,
				"exitCode": exitCode,
			})
		})

		api.GET("/containers/:id/terminal", activityTracker, func(c *gin.Context) {
			if dockerService == nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker service is not initialized"})
				return
			}

			id := c.Param("id")
			shell := c.DefaultQuery("shell", "auto")

			upgrader := websocket.Upgrader{
				CheckOrigin: func(r *http.Request) bool { return true },
			}
			conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
			if err != nil {
				logger.Errorf("WebSocket upgrade failed: %v", err)
				return
			}
			defer conn.Close()

			ctx, cancel := context.WithCancel(c.Request.Context())
			defer cancel()

			ctx, cancel = startKeepAlive(ctx, conn)
			defer cancel()

			err = dockerService.StreamTerminal(ctx, id, shell, conn)
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: %v", err)))
			}
		})

		api.GET("/containers/:id/logs", activityTracker, func(c *gin.Context) {
			if dockerService == nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Docker service is not initialized",
				})
				return
			}

			id := c.Param("id")
			tail := c.DefaultQuery("tail", "100")
			logs, err := dockerService.GetContainerLogs(c.Request.Context(), id, tail)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"logs": logs})
		})

		api.GET("/containers/:id/logs/stream", activityTracker, func(c *gin.Context) {
			if dockerService == nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Docker service is not initialized",
				})
				return
			}

			id := c.Param("id")
			tail := c.DefaultQuery("tail", "100")

			upgrader := websocket.Upgrader{
				CheckOrigin: func(r *http.Request) bool { return true }, // In production, should validate origin
			}

			conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
			if err != nil {
				logger.Errorf("WebSocket upgrade failed: %v", err)
				return
			}
			defer conn.Close()

			ctx, cancel := context.WithCancel(c.Request.Context())
			defer cancel()

			// Start keepalive
			ws.StartKeepAlive(ctx, conn)

			// Continuous read to handle control frames (ping/pong/close)
			go func() {
				for {
					if _, _, err := conn.ReadMessage(); err != nil {
						cancel()
						return
					}
				}
			}()

			err = dockerService.StreamContainerLogs(ctx, id, tail, conn)
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: %v", err)))
			}
		})

		api.GET("/projects", activityTracker, func(c *gin.Context) {
			if dockerService == nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Docker service is not initialized",
				})
				return
			}

			response, err := dockerService.GetProjectWorkspaces(c.Request.Context())
			if err != nil {
				logger.Errorf("Failed to get projects: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, response)
		})
	}

	// Serve Frontend
	uiFS, err := ui.FS()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize UI filesystem: %v", err)
	}
	httpFS := http.FS(uiFS)

	// Serve static files using Gin's StaticFS
	r.StaticFS("/assets", http.FS(mustSubFS(uiFS, "assets")))

	// Optional files that Vite typically produces in root
	serveIfExists(r, uiFS, httpFS, "/vite.svg")
	// You can add more root files here if needed

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// Do not fallback for API requests
		if strings.HasPrefix(path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}

		// Check if file exists in the UI filesystem
		if _, err := fs.Stat(uiFS, strings.TrimPrefix(path, "/")); err == nil {
			c.FileFromFS(path, httpFS)
			return
		}

		// Fallback to index.html for SPA routing
		c.FileFromFS("index.html", httpFS)
	})

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: r,
	}

	return srv, nil
}
