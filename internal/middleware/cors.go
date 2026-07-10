package middleware

import (
	"net/http"
	"strings"

	"docker-crafter/internal/config"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware dynamically reflects the request Origin if it matches the configured allowOrigins.
func CORSMiddleware(cfg config.CorsConfig) gin.HandlerFunc {
	originsList := strings.Split(cfg.AllowOrigin, ",")
	originsMap := make(map[string]bool)
	for _, o := range originsList {
		o = strings.TrimSpace(o)
		if o != "" {
			originsMap[o] = true
		}
	}

	allowMethods := "POST, OPTIONS, GET, PUT, DELETE, PATCH"
	if cfg.AllowMethods != "" {
		allowMethods = cfg.AllowMethods
	}

	allowHeaders := "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With"
	if cfg.AllowHeaders != "" {
		allowHeaders = cfg.AllowHeaders
	}

	return func(c *gin.Context) {
		reqOrigin := c.Request.Header.Get("Origin")
		if reqOrigin != "" {
			// Check if the origin is in our allowed list
			// Also allow if "*" is specified in the origins config
			if originsMap[reqOrigin] || originsMap["*"] {
				c.Writer.Header().Set("Access-Control-Allow-Origin", reqOrigin)
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
				c.Writer.Header().Set("Access-Control-Allow-Headers", allowHeaders)
				c.Writer.Header().Set("Access-Control-Allow-Methods", allowMethods)
			}
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
