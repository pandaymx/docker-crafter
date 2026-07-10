package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
)

func TestWebSocketUpgrade(t *testing.T) {
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upgrader := websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Fatalf("Failed to upgrade websocket: %v", err)
		}
		defer conn.Close()

		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()

		ctx, cancel = startKeepAlive(ctx, conn)
		defer cancel()

		_, p, err := conn.ReadMessage()
		if err != nil {
			return
		}
		conn.WriteMessage(websocket.TextMessage, p)
	}))
	defer s.Close()

	wsURL := "ws" + strings.TrimPrefix(s.URL, "http")
	dialer := websocket.Dialer{}
	conn, _, err := dialer.Dial(wsURL, nil)
	assert.NoError(t, err)
	defer conn.Close()

	err = conn.WriteMessage(websocket.TextMessage, []byte("hello"))
	assert.NoError(t, err)

	conn.SetReadDeadline(time.Now().Add(time.Second))
	msgType, p, err := conn.ReadMessage()
	assert.NoError(t, err)
	assert.Equal(t, websocket.TextMessage, msgType)
	assert.Equal(t, []byte("hello"), p)
}
