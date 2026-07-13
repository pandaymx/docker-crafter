import React, { useCallback, useRef, useState } from 'react';
import {
  ToastContext,
  type ToastMessage,
  type ToastType,
} from '../hooks/useToast';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = String(nextId.current++);
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        removeToast(id);
      }, 3000);
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string) => addToast(message, 'success'),
    [addToast],
  );
  const error = useCallback(
    (message: string) => addToast(message, 'error'),
    [addToast],
  );
  const info = useCallback(
    (message: string) => addToast(message, 'info'),
    [addToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, success, error, info, removeToast }}
    >
      {children}
    </ToastContext.Provider>
  );
}
