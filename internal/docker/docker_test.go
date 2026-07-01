package docker

import (
	"context"
	"errors"
	"testing"

	"github.com/docker/docker/api/types/container"
	"github.com/stretchr/testify/assert"
)

// mockDockerClient implements the DockerClient interface for testing.
type mockDockerClient struct {
	containers []container.Summary
	err        error
}

func (m *mockDockerClient) ContainerList(ctx context.Context, options container.ListOptions) ([]container.Summary, error) {
	return m.containers, m.err
}

func TestGetGroupedContainers(t *testing.T) {
	mockContainers := []container.Summary{
		{
			ID:     "111",
			Names:  []string{"/compose-web-1"},
			Image:  "nginx",
			State:  "running",
			Status: "Up 2 hours",
			Labels: map[string]string{
				"com.docker.compose.project": "my-compose-project",
			},
		},
		{
			ID:     "222",
			Names:  []string{"/compose-db-1"},
			Image:  "postgres",
			State:  "running",
			Status: "Up 2 hours",
			Labels: map[string]string{
				"com.docker.compose.project": "my-compose-project",
			},
		},
		{
			ID:     "333",
			Names:  []string{"/standalone-redis"},
			Image:  "redis",
			State:  "exited",
			Status: "Exited (0) 1 hour ago",
			Labels: map[string]string{},
		},
		{
			ID:     "444",
			Names:  []string{"/another-compose"},
			Image:  "alpine",
			State:  "running",
			Status: "Up 1 day",
			Labels: map[string]string{
				"com.docker.compose.project": "other-project",
			},
		},
		{
			ID:     "555",
			Names:  []string{"/no-labels-container"},
			Image:  "busybox",
			State:  "running",
			Status: "Up 5 minutes",
			Labels: nil, // Test nil labels map
		},
	}

	cli := &Client{
		cli: &mockDockerClient{
			containers: mockContainers,
			err:        nil,
		},
	}

	resp, err := cli.GetGroupedContainers(context.Background())
	assert.NoError(t, err)
	assert.NotNil(t, resp)

	// Check Compose groups
	assert.Contains(t, resp.Compose, "my-compose-project")
	assert.Len(t, resp.Compose["my-compose-project"], 2)
	assert.Equal(t, "111", resp.Compose["my-compose-project"][0].ID)
	assert.Equal(t, "compose-web-1", resp.Compose["my-compose-project"][0].Name) // Ensure / is removed

	assert.Contains(t, resp.Compose, "other-project")
	assert.Len(t, resp.Compose["other-project"], 1)
	assert.Equal(t, "another-compose", resp.Compose["other-project"][0].Name)

	// Check Standalone group
	assert.Len(t, resp.Standalone, 2)
	assert.Equal(t, "333", resp.Standalone[0].ID)
	assert.Equal(t, "standalone-redis", resp.Standalone[0].Name)
	assert.Equal(t, "555", resp.Standalone[1].ID)
	assert.Equal(t, "no-labels-container", resp.Standalone[1].Name)
}

func TestGetGroupedContainers_Error(t *testing.T) {
	expectedErr := errors.New("docker daemon is not running")
	cli := &Client{
		cli: &mockDockerClient{
			containers: nil,
			err:        expectedErr,
		},
	}

	resp, err := cli.GetGroupedContainers(context.Background())
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "failed to list containers")
	assert.Contains(t, err.Error(), expectedErr.Error())
}
