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
	actionErr  error
	actionLog  []string
}

func (m *mockDockerClient) ContainerList(ctx context.Context, options container.ListOptions) ([]container.Summary, error) {
	return m.containers, m.err
}

func (m *mockDockerClient) ContainerStart(ctx context.Context, containerID string, options container.StartOptions) error {
	m.actionLog = append(m.actionLog, "start:"+containerID)
	if m.actionErr != nil && containerID == "fail" {
		return m.actionErr
	}
	return nil
}

func (m *mockDockerClient) ContainerStop(ctx context.Context, containerID string, options container.StopOptions) error {
	m.actionLog = append(m.actionLog, "stop:"+containerID)
	if m.actionErr != nil && containerID == "fail" {
		return m.actionErr
	}
	return nil
}

func (m *mockDockerClient) ContainerRestart(ctx context.Context, containerID string, options container.StopOptions) error {
	m.actionLog = append(m.actionLog, "restart:"+containerID)
	if m.actionErr != nil && containerID == "fail" {
		return m.actionErr
	}
	return nil
}

func TestGetContainers(t *testing.T) {
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

	resp, err := cli.GetContainers(context.Background())
	assert.NoError(t, err)
	assert.NotNil(t, resp)

	assert.Len(t, resp, 5)

	// Check flat list contents
	assert.Equal(t, "111", resp[0].ID)
	assert.Equal(t, "compose-web-1", resp[0].Name) // Ensure / is removed
	assert.Equal(t, "my-compose-project", resp[0].Labels["com.docker.compose.project"])

	assert.Equal(t, "333", resp[2].ID)
	assert.Equal(t, "standalone-redis", resp[2].Name)

	assert.Equal(t, "555", resp[4].ID)
	assert.Equal(t, "no-labels-container", resp[4].Name)
	assert.Nil(t, resp[4].Labels)
}

func TestGetContainers_Error(t *testing.T) {
	expectedErr := errors.New("docker daemon is not running")
	cli := &Client{
		cli: &mockDockerClient{
			containers: nil,
			err:        expectedErr,
		},
	}

	resp, err := cli.GetContainers(context.Background())
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "failed to list containers")
	assert.Contains(t, err.Error(), expectedErr.Error())
}

func TestPerformAction(t *testing.T) {
	mockCli := &mockDockerClient{
		actionErr: errors.New("action failed"),
	}
	cli := &Client{cli: mockCli}

	ctx := context.Background()

	// Test successful actions
	res, err := cli.PerformAction(ctx, "start", []string{"c1", "c2"})
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Len(t, res.Successful, 2)
	assert.Len(t, res.Failed, 0)
	assert.Equal(t, []string{"start:c1", "start:c2"}, mockCli.actionLog)

	// Test partial failure
	mockCli.actionLog = nil // reset
	res, err = cli.PerformAction(ctx, "stop", []string{"c1", "fail", "c3"})
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Len(t, res.Successful, 2)
	assert.Len(t, res.Failed, 1)
	assert.Equal(t, "fail", res.Failed[0].ContainerID)
	assert.Equal(t, "action failed", res.Failed[0].Error)
	assert.Equal(t, []string{"stop:c1", "stop:fail", "stop:c3"}, mockCli.actionLog)

	// Test invalid action
	mockCli.actionLog = nil // reset
	res, err = cli.PerformAction(ctx, "invalid", []string{"c1"})
	assert.Error(t, err)
	assert.Nil(t, res)
	assert.Contains(t, err.Error(), "invalid action: invalid")
	assert.Len(t, mockCli.actionLog, 0)
}
