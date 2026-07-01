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

// ContainerGroupsResponse represents the grouped containers.
type ContainerGroupsResponse struct {
	Compose    map[string][]ContainerInfo `json:"compose"`
	Standalone []ContainerInfo            `json:"standalone"`
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

// GetGroupedContainers fetches all containers and groups them by compose/standalone.
func (c *Client) GetGroupedContainers(ctx context.Context) (*ContainerGroupsResponse, error) {
	containers, err := c.cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	response := &ContainerGroupsResponse{
		Compose:    make(map[string][]ContainerInfo),
		Standalone: make([]ContainerInfo, 0),
	}

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

		projectLabel := c.Labels["com.docker.compose.project"]
		if projectLabel != "" {
			response.Compose[projectLabel] = append(response.Compose[projectLabel], info)
		} else {
			response.Standalone = append(response.Standalone, info)
		}
	}

	return response, nil
}
