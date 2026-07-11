import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import React from 'react';
import { type ToastType, useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-cyan-400" />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 w-80 px-4 py-3 rounded-lg shadow-xl shadow-slate-900/50',
            'bg-slate-800 border border-slate-700/50 text-slate-200',
            'transform transition-all duration-300 ease-in-out',
            'animate-in slide-in-from-right-full fade-in',
          )}
          role="alert"
        >
          <div className="flex-shrink-0">{iconMap[toast.type]}</div>

          <div className="flex-1 text-sm font-medium pr-2 truncate">
            {toast.message}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors focus:outline-none"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
