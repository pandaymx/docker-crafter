import {
  Play,
  RefreshCw,
  Square,
  SquareTerminal,
  Terminal,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ContainerInfo } from '../types';
import { cn } from '../utils/cn';
import { formatBytes } from '../utils/format';
import { ProgressBar } from './ui/ProgressBar';
import { StatusBadge } from './ui/StatusBadge';

export interface ContainerCardProps {
  container: ContainerInfo;
  onStart?: (id: string, name: string) => void;
  onStop?: (id: string, name: string) => void;
  onRestart?: (id: string, name: string) => void;
  onLogs?: (id: string, name: string) => void;
  onTerminal?: (id: string, name: string) => void;
}

export const ContainerCard: React.FC<ContainerCardProps> = ({
  container,
  onStart,
  onStop,
  onRestart,
  onLogs,
  onTerminal,
}) => {
  const { t } = useTranslation();
  const isRunning = container.state === 'running';

  const renderPorts = () => {
    if (!container.ports || container.ports.length === 0) {
      return (
        <span className="text-slate-500 text-xs">{t('container.noPorts')}</span>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        {container.ports.map((portStr, index) => {
          // Attempt to extract public port if formatted like "0.0.0.0:8080->80/tcp" or just use the whole string
          const match = portStr.match(/:(\d+)->/);
          const publicPort = match
            ? match[1]
            : portStr.split(':')[1]?.split('->')[0];

          if (publicPort) {
            return (
              <a
                key={index}
                href={`http://localhost:${publicPort}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs bg-blue-500/10 px-1.5 py-0.5 rounded transition-colors"
                title={portStr}
              >
                {publicPort}
              </a>
            );
          }
          return (
            <span
              key={index}
              className="text-slate-400 text-xs px-1.5 py-0.5"
              title={portStr}
            >
              {portStr}
            </span>
          );
        })}
      </div>
    );
  };

  const memoryUsage = isRunning ? container.memoryUsage || 0 : 0;
  const memoryLimit = isRunning ? container.memoryLimit || 0 : 0;
  const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

  const cpuUsage = isRunning ? container.cpuUsage || 0 : 0;

  const isAnomalous =
    (container.state === 'exited' &&
      container.status.match(/\((\d+)\)/)?.[1] !== '0') ||
    container.status.toLowerCase().includes('unhealthy') ||
    container.status.toLowerCase().includes('error');

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-4 font-mono transition-colors hover:border-slate-600/50">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-semibold text-slate-200 truncate"
            title={container.name}
          >
            {container.name}
          </span>
          <StatusBadge
            status={
              isAnomalous ? 'anomalous' : isRunning ? 'running' : 'stopped'
            }
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isRunning ? (
            <button
              onClick={() => onStop?.(container.id, container.name)}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
              title={t('container.stop')}
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              onClick={() => onStart?.(container.id, container.name)}
              className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-colors"
              title={t('container.start')}
            >
              <Play size={16} />
            </button>
          )}
          <button
            onClick={() => onRestart?.(container.id, container.name)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title={t('container.restart')}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => onLogs?.(container.id, container.name)}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
            title={t('container.logs')}
          >
            <Terminal size={16} />
          </button>
          <button
            onClick={() => onTerminal?.(container.id, container.name)}
            className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded transition-colors"
            title={t('container.terminal')}
          >
            <SquareTerminal size={16} />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-700/30">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">CPU</span>
            <span
              className={cn(
                'font-medium',
                isRunning
                  ? cpuUsage > 80
                    ? 'text-red-400'
                    : cpuUsage > 40
                      ? 'text-orange-400'
                      : 'text-cyan-400'
                  : 'text-slate-500',
              )}
            >
              {isRunning ? `${cpuUsage.toFixed(1)}%` : '0.0%'}
            </span>
          </div>
          <ProgressBar
            value={cpuUsage}
            colorType="cpu"
            isOffline={!isRunning}
            isAnomalous={isAnomalous}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">MEM</span>
            <span className="font-medium text-slate-300">
              {isRunning
                ? `${formatBytes(memoryUsage)} / ${formatBytes(memoryLimit)}`
                : '0 B / 0 B'}
            </span>
          </div>
          <ProgressBar
            value={memoryPercent}
            colorType="memory"
            isOffline={!isRunning}
            isAnomalous={isAnomalous}
          />
        </div>
      </div>

      {/* Details & Ports */}
      <div className="flex flex-col gap-2 mt-auto">
        <div className="flex items-center justify-between text-xs">
          <span
            className="text-slate-500 truncate mr-2"
            title={container.image}
          >
            {container.image}
          </span>
          <span className="text-slate-400 shrink-0 capitalize">
            {container.state}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1 pt-2 border-t border-slate-700/50">
          <span
            className="text-slate-500 truncate max-w-[50%] mr-2"
            title={container.status}
          >
            {container.status}
          </span>
          <div className="flex-1 flex justify-end truncate">
            {renderPorts()}
          </div>
        </div>
      </div>
    </div>
  );
};
