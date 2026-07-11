import { useVirtualizer } from '@tanstack/react-virtual';
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
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResizeObserver } from '../hooks/useResizeObserver';
import type { ContainerInfo, ProjectWorkspace } from '../types';
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
  const { ref: containerRef, width: containerWidth } =
    useResizeObserver<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use a more appropriate breakpoint for container width.
  // xl screens are 1280px wide viewport, but the container will be smaller due to padding/sidebar.
  // We can assume if the container itself is wider than ~800px, it can safely fit 2 columns.
  const columns = containerWidth >= 800 ? 2 : 1;
  const rowCount = Math.ceil(workspace.containers.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 180, // estimated height of ContainerCard + gap
    overscan: 2,
  });

  const totalCount = workspace.containers.length;
  const runningCount = workspace.containers.filter(
    (c) => c.state === 'running',
  ).length;

  const isAnomalous = workspace.containers.some((c) => {
    if (c.state === 'exited' && c.status.match(/\((\d+)\)/)?.[1] !== '0')
      return true;
    if (
      c.status.toLowerCase().includes('unhealthy') ||
      c.status.toLowerCase().includes('error')
    )
      return true;
    return false;
  });

  let workspaceStatus:
    | 'running-all'
    | 'stopped-all'
    | 'running-partial'
    | 'anomalous' = 'stopped-all';

  if (isAnomalous) {
    workspaceStatus = 'anomalous';
  } else if (runningCount === totalCount && totalCount > 0) {
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
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        ref={containerRef}
      >
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

          <StatusBadge status={workspaceStatus as any} />

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
        <div
          ref={scrollRef}
          className="mt-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar"
        >
          {workspace.containers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl bg-slate-800/30">
              {'No containers'}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const startIndex = virtualRow.index * columns;
                const rowContainers = workspace.containers.slice(
                  startIndex,
                  startIndex + columns,
                );

                return (
                  <div
                    key={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        gap: '16px', // matches gap-4
                        paddingBottom: '16px', // Add gap at the bottom of the row so the virtualizer includes it in the measured size
                      }}
                    >
                      {rowContainers.map((container: ContainerInfo) => (
                        <div key={container.id}>
                          <ContainerCard
                            container={container}
                            onStart={onContainerStart}
                            onStop={onContainerStop}
                            onRestart={onContainerRestart}
                            onLogs={onContainerLogs}
                            onTerminal={onContainerTerminal}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
