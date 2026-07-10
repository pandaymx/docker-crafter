import { useCallback, useEffect, useState } from 'react';
import type { ProjectWorkspace } from '../types';

export interface ActionError {
  container_id: string;
  error: string;
}

export interface ContainerActionResults {
  successful: string[];
  failed: ActionError[];
}

export function useContainers() {
  const [workspaces, setWorkspaces] = useState<ProjectWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setWorkspaces(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
    const timer = setInterval(fetchWorkspaces, 3000);
    return () => clearInterval(timer);
  }, [fetchWorkspaces]);

  const performSingleAction = async (
    id: string,
    action: string,
    name: string,
  ) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/v1/containers/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        throw new Error(`Failed to perform ${action} on ${name}`);
      }
      // Wait for completion, then fetch immediately to update UI without waiting for next poll
      await fetchWorkspaces();
    } catch (err: any) {
      console.error('Error performing action:', err);
      // Depending on requirements, we could also expose action errors
    } finally {
      setActionLoading(false);
    }
  };

  const performBatchAction = async (
    action: string,
    containerIds?: string[],
    projectName?: string,
  ): Promise<ContainerActionResults> => {
    setActionLoading(true);
    try {
      const body: any = { action };
      if (containerIds) body.container_ids = containerIds;
      if (projectName) body.projectName = projectName;

      const response = await fetch('/api/v1/containers/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to perform batch ${action}`);
      }

      const results = await response.json();
      await fetchWorkspaces();
      return results;
    } catch (err: any) {
      console.error('Error performing batch action:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    workspaces,
    loading,
    error,
    actionLoading,
    performSingleAction,
    performBatchAction,
  };
}
