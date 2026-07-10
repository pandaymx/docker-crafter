package docker

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
)

// DockerClient interface abstracts the Docker client for easier testing.
type DockerClient interface {
	ContainerList(ctx context.Context, options container.ListOptions) ([]container.Summary, error)
	ContainerStart(ctx context.Context, containerID string, options container.StartOptions) error
	ContainerStop(ctx context.Context, containerID string, options container.StopOptions) error
	ContainerRestart(ctx context.Context, containerID string, options container.StopOptions) error
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

// PerformAction executes a specified action (start, stop, restart) on a list of containers.
func (c *Client) PerformAction(ctx context.Context, action string, containerIDs []string) (*ContainerActionResults, error) {
	results := &ContainerActionResults{
		Successful: make([]string, 0),
		Failed:     make([]ActionError, 0),
	}

	for _, id := range containerIDs {
		var err error
		switch action {
		case "start":
			err = c.cli.ContainerStart(ctx, id, container.StartOptions{})
		case "stop":
			err = c.cli.ContainerStop(ctx, id, container.StopOptions{})
		case "restart":
			err = c.cli.ContainerRestart(ctx, id, container.StopOptions{})
		default:
			return nil, fmt.Errorf("invalid action: %s", action)
		}

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
