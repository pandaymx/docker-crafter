package docker

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
)

// ContainerInfo represents the structured information for a Docker container.
type ContainerInfo struct {
	ID     string            `json:"id"`
	Name   string            `json:"name"`
	Image  string            `json:"image"`
	State  string            `json:"state"`
	Status string            `json:"status"`
	Labels map[string]string `json:"labels"`
}

// DockerClient interface abstracts the Docker client for easier testing.
type DockerClient interface {
	ContainerList(ctx context.Context, options container.ListOptions) ([]container.Summary, error)
}

// Client wraps the Docker client.
type Client struct {
	cli DockerClient
}

// NewClient initializes a new Docker client from the environment.
func NewClient() (*Client, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}
	return &Client{cli: cli}, nil
}

// GetContainers fetches all containers and returns them as a flat slice.
func (c *Client) GetContainers(ctx context.Context) ([]ContainerInfo, error) {
	containers, err := c.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	response := make([]ContainerInfo, 0, len(containers))

	for _, c := range containers {
		name := ""
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}

		info := ContainerInfo{
			ID:     c.ID,
			Name:   name,
			Image:  c.Image,
			State:  c.State,
			Status: c.Status,
			Labels: c.Labels,
		}

		response = append(response, info)
	}

	return response, nil
}
