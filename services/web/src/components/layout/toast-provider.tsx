'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '../../lib/utils';

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone?: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const value = useMemo(() => ({ toasts, pushToast, dismiss }), [toasts, pushToast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'w-80 rounded-lg border shadow-lg bg-white p-3 text-sm',
              toast.tone === 'success' && 'border-emerald-200',
              toast.tone === 'error' && 'border-red-200',
              toast.tone === 'info' && 'border-sky-200'
            )}
          >
            <div className="font-semibold">{toast.title}</div>
            {toast.description && <div className="text-slate-700 mt-1">{toast.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
