import React from 'react';
import { cn } from '../../utils/cn';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status:
    | 'running'
    | 'stopped'
    | 'exited'
    | 'error'
    | 'unknown'
    | 'running-all'
    | 'running-partial'
    | 'stopped-all'
    | 'anomalous';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  children,
  showDot = true,
  ...props
}) => {
  const isRunning = status === 'running' || status === 'running-all';
  const isPartial = status === 'running-partial';
  const isStoppedAll = status === 'stopped-all';
  const isAnomalous = status === 'anomalous';
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border',
        {
          'bg-emerald-950/30 text-emerald-400 border-emerald-900/50': isRunning,
          'bg-amber-950/30 text-amber-400 border-amber-900/50': isPartial,
          'bg-slate-900/60 text-slate-400 border-slate-700/50': isStoppedAll,
          'bg-rose-950/30 text-rose-400 border-rose-900/50':
            status === 'stopped' || status === 'exited',
          'bg-red-950/30 text-red-400 border-red-900/50': status === 'error',
          'bg-slate-800 text-slate-400 border-slate-700/50':
            status === 'unknown',
          'bg-amber-950/30 text-red-400 border-red-900/50': isAnomalous,
        },
        className,
      )}
      {...props}
    >
      {showDot && (
        <div className="relative flex h-2 w-2 shrink-0 items-center justify-center">
          {(isRunning || isPartial || isAnomalous) && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-40 animate-pulse',
                {
                  'bg-emerald-500': isRunning,
                  'bg-amber-500': isPartial,
                  'bg-red-500': isAnomalous,
                },
              )}
            />
          )}
          <span
            className={cn('relative inline-flex rounded-full h-1.5 w-1.5', {
              'bg-emerald-500': isRunning,
              'bg-amber-500': isPartial,
              'bg-slate-500 h-2 w-2': isStoppedAll || status === 'unknown',
              'bg-rose-500 h-2 w-2':
                status === 'stopped' || status === 'exited',
              'bg-red-500 h-2 w-2': status === 'error' || isAnomalous,
            })}
          />
        </div>
      )}
      {children}
    </div>
  );
};
