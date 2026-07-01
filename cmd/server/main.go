package main

import (
	"log"
	"net/http"

	"docker-crafter/internal/docker"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// Initialize Docker client
	dockerClient, err := docker.NewClient()
	if err != nil {
		// Log the error but don't crash, as we want to gracefully degrade if Docker is missing
		log.Printf("Warning: Failed to initialize Docker client: %v", err)
	}

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	api := r.Group("/api/v1")
	{
		api.GET("/containers", func(c *gin.Context) {
			if dockerClient == nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Docker client is not initialized",
				})
				return
			}

			response, err := dockerClient.GetContainers(c.Request.Context())
			if err != nil {
				log.Printf("Error: Failed to get containers: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": err.Error(),
				})
				return
			}

			c.JSON(http.StatusOK, response)
		})
	}

	log.Println("Starting server on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
