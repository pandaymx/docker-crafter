import { useEffect, useState } from 'react';
import type {
  ContainerInfo,
  ContainerWithHealth,
  HealthStatus,
  Workspace,
} from '../types';

// Helper to determine health
const getHealthStatus = (c: ContainerInfo): HealthStatus => {
  if (c.state === 'running') {
    if (c.status.toLowerCase().includes('unhealthy')) {
      return 'unhealthy';
    }
    return 'running';
  } else if (c.state === 'exited' && c.status.includes('(0)')) {
    return 'stopped'; // Graceful exit
  } else if (
    c.state === 'exited' ||
    c.state === 'dead' ||
    c.state === 'created'
  ) {
    return 'unhealthy'; // Warning/Crash
  }
  return 'stopped';
};

export interface ActionError {
  container_id: string;
  error: string;
}

export interface ContainerActionResults {
  successful: string[];
  failed: ActionError[];
}

export const useContainers = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/containers');
      if (!response.ok) {
        throw new Error('Failed to fetch containers');
      }

      const data: ContainerInfo[] = await response.json();

      // Map-Reduce logic
      const grouped = data.reduce(
        (acc: Record<string, Workspace>, container) => {
          const healthStatus = getHealthStatus(container);
          const cWithHealth: ContainerWithHealth = {
            ...container,
            healthStatus,
          };

          let workspaceName = 'Standalone';
          let workspaceType: Workspace['type'] = 'standalone';

          if (container.labels) {
            if (container.labels['com.docker.compose.project']) {
              workspaceName = container.labels['com.docker.compose.project'];
              workspaceType = 'compose';
            } else if (container.labels['devdocker.workspace']) {
              workspaceName = container.labels['devdocker.workspace'];
              workspaceType = 'custom';
            }
          }

          if (!acc[workspaceName]) {
            acc[workspaceName] = {
              name: workspaceName,
              type: workspaceType,
              containers: [],
              runningCount: 0,
              totalCount: 0,
            };
          }

          acc[workspaceName].containers.push(cWithHealth);
          acc[workspaceName].totalCount += 1;
          if (healthStatus === 'running') {
            acc[workspaceName].runningCount += 1;
          }

          return acc;
        },
        {},
      );

      // Convert to array and sort: Compose -> Custom -> Standalone
      const workspacesArr = Object.values(grouped).sort((a, b) => {
        const rank = { compose: 1, custom: 2, standalone: 3 };
        if (rank[a.type] !== rank[b.type]) {
          return rank[a.type] - rank[b.type];
        }
        return a.name.localeCompare(b.name);
      });

      setWorkspaces(workspacesArr);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const performAction = async (
    action: 'start' | 'stop' | 'restart',
    containerIds: string[],
  ): Promise<ContainerActionResults> => {
    if (containerIds.length === 0) {
      return { successful: [], failed: [] };
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/v1/containers/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          container_ids: containerIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform action');
      }

      const results: ContainerActionResults = await response.json();

      // Refresh the container list after an action is completed
      await fetchContainers();

      return results;
    } catch (err: any) {
      console.error('Error performing action:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return { workspaces, loading, error, performAction, actionLoading };
};
