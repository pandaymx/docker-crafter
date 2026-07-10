import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ContainerActionResults } from '../../hooks/useContainers';
import type { ProjectWorkspace } from '../../types';
import { WorkspaceCard } from '../WorkspaceCard';

interface StageProps {
  workspace: ProjectWorkspace | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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

export const Stage: React.FC<StageProps> = ({
  workspace,
  isCollapsed,
  onToggleCollapse,
  performSingleAction,
  performBatchAction,
}) => {
  const { t } = useTranslation();

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 bg-slate-950">
        {t(
          '请在侧边栏选择工作区或当前没有匹配的工作区',
          'Select a workspace from the sidebar or no matching workspaces',
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-200">
      <div className="flex-1 overflow-y-auto p-6">
        <WorkspaceCard
          workspace={workspace}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
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
          onContainerStop={(id, name) => performSingleAction(id, 'stop', name)}
          onContainerRestart={(id, name) =>
            performSingleAction(id, 'restart', name)
          }
          onContainerLogs={(id, name) => {
            // Placeholder: Could navigate to a logs view or open a modal
            console.log(`Open logs for ${name} (${id})`);
          }}
          onContainerTerminal={(id, name) => {
            // Placeholder: Could navigate to a terminal view or open a modal
            console.log(`Open terminal for ${name} (${id})`);
          }}
        />
      </div>
    </div>
  );
};
