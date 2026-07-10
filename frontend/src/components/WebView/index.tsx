import React from 'react';
import type { ContainerActionResults } from '../../hooks/useContainers';
import type { ProjectWorkspace } from '../../types';
import { KanbanBoard } from './KanbanBoard';

interface WebViewProps {
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
  onOpenLogs?: (id: string, name: string) => void;
  onOpenTerminal?: (id: string, name: string) => void;
}

export const WebView: React.FC<WebViewProps> = ({
  workspaces,
  collapsedWorkspaces,
  onToggleCollapse,
  performSingleAction,
  performBatchAction,
  onOpenLogs,
  onOpenTerminal,
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-slate-950 font-sans">
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          workspaces={workspaces}
          collapsedWorkspaces={collapsedWorkspaces}
          onToggleCollapse={onToggleCollapse}
          performSingleAction={performSingleAction}
          performBatchAction={performBatchAction}
          onOpenLogs={onOpenLogs}
          onOpenTerminal={onOpenTerminal}
        />
      </div>
    </div>
  );
};
