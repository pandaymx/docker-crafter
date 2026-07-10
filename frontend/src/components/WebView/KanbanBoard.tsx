import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ContainerActionResults } from '../../hooks/useContainers';
import type { ProjectWorkspace } from '../../types';
import { WorkspaceCard } from '../WorkspaceCard';

interface KanbanBoardProps {
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

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  workspaces,
  collapsedWorkspaces,
  onToggleCollapse,
  performSingleAction,
  performBatchAction,
}) => {
  const { t } = useTranslation();

  return (
    <div className="h-full w-full bg-slate-950 text-slate-300 overflow-y-auto p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-20">
        {workspaces.map((ws) => (
          <WorkspaceCard
            key={ws.projectName}
            workspace={ws}
            isCollapsed={collapsedWorkspaces[ws.projectName] || false}
            onToggleCollapse={() => onToggleCollapse(ws.projectName)}
            onBatchStart={(projectName) =>
              performBatchAction('start', undefined, projectName)
            }
            onBatchStop={(projectName) =>
              performBatchAction('stop', undefined, projectName)
            }
            onBatchRestart={(projectName) =>
              performBatchAction('restart', undefined, projectName)
            }
            onContainerStart={(id, name) =>
              performSingleAction(id, 'start', name)
            }
            onContainerStop={(id, name) =>
              performSingleAction(id, 'stop', name)
            }
            onContainerRestart={(id, name) =>
              performSingleAction(id, 'restart', name)
            }
            onContainerLogs={(id, name) => {
              console.log(`Open logs for ${name} (${id})`);
            }}
            onContainerTerminal={(id, name) => {
              console.log(`Open terminal for ${name} (${id})`);
            }}
          />
        ))}

        {workspaces.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <p className="text-lg">
              {t(
                '没有找到匹配的工作区或容器',
                'No matching workspaces or containers found',
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
