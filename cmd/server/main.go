package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"docker-crafter/internal/config"
	"docker-crafter/internal/server"
	"docker-crafter/internal/ui"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

// App struct
type App struct {
	ctx        context.Context
	httpServer *http.Server
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Create the HTTP server
	a.httpServer, err = server.NewHTTPServer(cfg)
	if err != nil {
		log.Fatalf("Failed to create HTTP server: %v", err)
	}

	// Start Gin server asynchronously
	go func() {
		log.Printf("Starting Gin server on %s...", a.httpServer.Addr)
		if err := a.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Gin server error: %v", err)
		}
	}()
}

// shutdown is called when the app closes
func (a *App) shutdown(ctx context.Context) {
	if a.httpServer != nil {
		log.Println("Shutting down Gin server...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := a.httpServer.Shutdown(shutdownCtx); err != nil {
			log.Printf("Gin server shutdown failed: %v", err)
		} else {
			log.Println("Gin server shut down gracefully")
		}
	}
}

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Get the frontend assets for Wails
	assets, err := ui.FS()
	if err != nil {
		log.Fatalf("Failed to get UI assets: %v", err)
	}

	// Create application with options
	err = wails.Run(&options.App{
		Title:  "Docker Crafter",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
