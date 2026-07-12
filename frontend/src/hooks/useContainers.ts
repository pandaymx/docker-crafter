import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import type { ProjectWorkspace } from '../types';
import { getApiBaseUrl } from '../utils/api';

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
  const { t } = useTranslation();
  const toast = useToast();

  const fetchWorkspaces = useCallback(async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/projects`);
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
      const baseUrl = getApiBaseUrl();
      const response = await fetch(
        `${baseUrl}/api/v1/containers/${id}/action`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to perform ${action} on ${name}`);
      }
      // Wait for completion, then fetch immediately to update UI without waiting for next poll
      await fetchWorkspaces();

      if (action === 'start') {
        toast.success(t('toast.startSuccess', { name }));
      } else if (action === 'stop') {
        toast.success(t('toast.stopSuccess', { name }));
      } else if (action === 'restart') {
        toast.success(t('toast.restartSuccess', { name }));
      } else if (action === 'exec') {
        toast.success(t('toast.execSuccess', { name }));
      }
    } catch (err: any) {
      console.error('Error performing action:', err);
      if (action === 'start') {
        toast.error(t('toast.startError', { name }));
      } else if (action === 'stop') {
        toast.error(t('toast.stopError', { name }));
      } else if (action === 'restart') {
        toast.error(t('toast.restartError', { name }));
      } else if (action === 'exec') {
        toast.error(t('toast.execError', { error: err.message }));
      }
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

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/v1/containers/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to perform batch ${action}`);
      }

      const results = await response.json();
      await fetchWorkspaces();

      const targetName = projectName || 'Batch Action';

      if (action === 'start') {
        toast.success(t('toast.startSuccess', { name: targetName }));
      } else if (action === 'stop') {
        toast.success(t('toast.stopSuccess', { name: targetName }));
      } else if (action === 'restart') {
        toast.success(t('toast.restartSuccess', { name: targetName }));
      } else if (action === 'exec') {
        toast.success(t('toast.execSuccess', { name: targetName }));
      }

      return results;
    } catch (err: any) {
      console.error('Error performing batch action:', err);
      const targetName = projectName || 'Batch Action';

      if (action === 'start') {
        toast.error(t('toast.startError', { name: targetName }));
      } else if (action === 'stop') {
        toast.error(t('toast.stopError', { name: targetName }));
      } else if (action === 'restart') {
        toast.error(t('toast.restartError', { name: targetName }));
      } else if (action === 'exec') {
        toast.error(t('toast.execError', { error: err.message }));
      }
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
