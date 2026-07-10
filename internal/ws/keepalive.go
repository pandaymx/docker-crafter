package ws

import (
	"context"
	"time"

	"github.com/gorilla/websocket"
)

// StartKeepAlive initiates a ping/pong keepalive loop for a WebSocket connection.
// It returns a new context and a cancel function that can be used to stop the loop
// or react to connection closure.
func StartKeepAlive(ctx context.Context, conn *websocket.Conn) (context.Context, context.CancelFunc) {
	ctx, cancel := context.WithCancel(ctx)

	// Set initial read deadline
	conn.SetReadDeadline(time.Now().Add(40 * time.Second))

	// Reset read deadline on receiving pong
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
				// Send ping message
				if err := conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(10*time.Second)); err != nil {
					cancel()
					return
				}
			}
		}
	}()

	return ctx, cancel
}
