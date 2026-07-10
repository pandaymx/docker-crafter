import {
  ChevronDown,
  ChevronRight,
  FolderGit2,
  MoreVertical,
  Package,
  Play,
  RefreshCw,
  Square,
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectWorkspace } from '../types';
import { ContainerCard } from './ContainerCard';
import { GlassPanel } from './ui/GlassPanel';
import { StatusBadge } from './ui/StatusBadge';

export interface WorkspaceCardProps {
  workspace: ProjectWorkspace;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onBatchStart?: (projectName: string) => void;
  onBatchStop?: (projectName: string) => void;
  onBatchRestart?: (projectName: string) => void;
  onContainerStart?: (id: string, name: string) => void;
  onContainerStop?: (id: string, name: string) => void;
  onContainerRestart?: (id: string, name: string) => void;
  onContainerLogs?: (id: string, name: string) => void;
  onContainerTerminal?: (id: string, name: string) => void;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  workspace,
  isCollapsed = false,
  onToggleCollapse,
  onBatchStart,
  onBatchStop,
  onBatchRestart,
  onContainerStart,
  onContainerStop,
  onContainerRestart,
  onContainerLogs,
  onContainerTerminal,
}) => {
  const { t } = useTranslation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const totalCount = workspace.containers.length;
  const runningCount = workspace.containers.filter(
    (c) => c.state === 'running',
  ).length;

  let workspaceStatus: 'running-all' | 'stopped-all' | 'running-partial' =
    'stopped-all';
  if (runningCount === totalCount && totalCount > 0) {
    workspaceStatus = 'running-all'; // all running -> green
  } else if (runningCount > 0) {
    workspaceStatus = 'running-partial'; // partial running -> orange
  }

  const handleStopAllClick = () => {
    setShowMoreMenu(false);
    setShowStopConfirm(true);
  };

  const confirmStopAll = () => {
    onBatchStop?.(workspace.projectName);
    setShowStopConfirm(false);
  };

  const Icon = workspace.isCompose ? FolderGit2 : Package;
  const iconColor = workspace.isCompose ? 'text-blue-400' : 'text-emerald-400';

  return (
    <GlassPanel className="p-5 rounded-2xl bg-slate-900/80 border-slate-800 flex flex-col gap-4 relative">
      {/* Stop Confirmation Dialog Overlay */}
      {showStopConfirm && (
        <div className="absolute inset-0 z-20 bg-slate-900/90 rounded-2xl flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              {t('workspace.stopAll')}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {'Are you sure you want to stop'}{' '}
              <span className="font-semibold text-slate-200">
                {workspace.projectName}
              </span>{' '}
              {'all containers under this workspace?'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {'Cancel'}
              </button>
              <button
                onClick={confirmStopAll}
                className="px-4 py-2 text-sm bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-medium"
              >
                {'Confirm Stop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 bg-slate-800 rounded-lg border border-slate-700/50 ${iconColor}`}
          >
            <Icon size={20} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">
                {workspace.projectName}
              </h2>
              <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                {workspace.engineName}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {runningCount} / {totalCount} {t('workspace.running')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          {/* Batch Actions */}
          <div className="flex items-center bg-slate-800/80 rounded-lg border border-slate-700/50 p-0.5">
            <button
              onClick={() => onBatchStart?.(workspace.projectName)}
              className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded transition-colors"
              title={t('workspace.startAll')}
            >
              <Play size={16} />
            </button>
            <button
              onClick={() => onBatchRestart?.(workspace.projectName)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
              title={t('workspace.restartAll')}
            >
              <RefreshCw size={16} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-[120px]">
                    <button
                      onClick={handleStopAllClick}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 transition-colors"
                    >
                      <Square size={14} /> {t('workspace.stopAll')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <StatusBadge status={workspaceStatus} />

          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronDown size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Container List */}
      {!isCollapsed && (
        <div className="mt-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {workspace.containers.map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
                onStart={onContainerStart}
                onStop={onContainerStop}
                onRestart={onContainerRestart}
                onLogs={onContainerLogs}
                onTerminal={onContainerTerminal}
              />
            ))}
            {workspace.containers.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                {'No containers'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
        <span>
          {totalCount} {t('workspace.services')}
        </span>
        <span className="px-2 py-0.5 bg-slate-800/50 rounded text-slate-400">
          {t('workspace.localEnv')}
        </span>
      </div>
    </GlassPanel>
  );
};
