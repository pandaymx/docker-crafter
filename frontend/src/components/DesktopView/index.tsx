import React, { useEffect, useMemo, useState } from 'react';
import type { ContainerActionResults } from '../../hooks/useContainers';
import type { ProjectWorkspace, Workspace } from '../../types';
import { Sidebar } from './Sidebar';
import { Stage } from './Stage';

interface DesktopViewProps {
  workspaces: ProjectWorkspace[];
  collapsedWorkspaces: Record<string, boolean>;
  onToggleCollapse: (projectName: string) => void;
  performSingleAction: (
    id: string,
    action: string,
    name: string,
  ) => Promise<void>;
  performBatchAction: (
    action: string,
    containerIds?: string[],
    projectName?: string,
  ) => Promise<ContainerActionResults>;
}

export const DesktopView: React.FC<DesktopViewProps> = ({
  workspaces,
  collapsedWorkspaces,
  onToggleCollapse,
  performSingleAction,
  performBatchAction,
}) => {
  const [selectedWs, setSelectedWs] = useState<string | null>(null);

  // Auto-select first workspace if none selected or if selected one is filtered out
  useEffect(() => {
    if (
      workspaces.length > 0 &&
      (!selectedWs || !workspaces.find((w) => w.projectName === selectedWs))
    ) {
      setSelectedWs(workspaces[0].projectName);
    }
  }, [workspaces, selectedWs]);

  // Map ProjectWorkspace[] to Workspace[] exclusively for Sidebar to maintain its untouched structure constraint
  const legacyWorkspacesForSidebar: Workspace[] = useMemo(() => {
    return workspaces.map((ws) => {
      const runningCount = ws.containers.filter(
        (c) => c.state === 'running',
      ).length;
      return {
        name: ws.projectName,
        type: ws.isCompose ? 'compose' : 'standalone', // rough mapping just for the icon/badge
        containers: [], // not used by sidebar
        runningCount,
        totalCount: ws.containers.length,
      };
    });
  }, [workspaces]);

  const activeWorkspace =
    workspaces.find((w) => w.projectName === selectedWs) || null;

  return (
    <div className="flex h-full w-full bg-slate-950 font-sans text-slate-200 overflow-hidden">
      <Sidebar
        workspaces={legacyWorkspacesForSidebar}
        selectedWorkspace={selectedWs}
        onSelect={setSelectedWs}
      />
      <Stage
        workspace={activeWorkspace}
        isCollapsed={
          activeWorkspace
            ? collapsedWorkspaces[activeWorkspace.projectName]
            : false
        }
        onToggleCollapse={() =>
          activeWorkspace && onToggleCollapse(activeWorkspace.projectName)
        }
        performSingleAction={performSingleAction}
        performBatchAction={performBatchAction}
      />
    </div>
  );
};
