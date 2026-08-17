'use client';
import {
  createContext, useContext, useCallback, useState, useEffect, useRef,
  type ReactNode,
} from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = sticky
  action?: { label: string; onClick: () => void };
}

type AddToast = (toast: Omit<Toast, 'id'>) => string;
type RemoveToast = (id: string) => void;

interface ToastContextValue {
  addToast: AddToast;
  removeToast: RemoveToast;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

// ── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────────────

let counter = 0;

export function ToastProvider({ children, maxVisible = 5 }: {
  children: ReactNode;
  maxVisible?: number;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast: RemoveToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast: AddToast = useCallback((toast) => {
    const id = `toast-${++counter}`;
    setToasts(prev => [...prev.slice(-(maxVisible - 1)), { ...toast, id }]);
    return id;
  }, [maxVisible]);

  const success = useCallback((title: string, message?: string) =>
    addToast({ variant: 'success', title, message, duration: 4000 }), [addToast]);

  const error = useCallback((title: string, message?: string) =>
    addToast({ variant: 'error', title, message, duration: 8000 }), [addToast]);

  const warning = useCallback((title: string, message?: string) =>
    addToast({ variant: 'warning', title, message, duration: 6000 }), [addToast]);

  const info = useCallback((title: string, message?: string) =>
    addToast({ variant: 'info', title, message, duration: 4000 }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ── Container ───────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: {
  toasts: Toast[];
  onRemove: RemoveToast;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ── Individual toast ────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { bg: string; icon: typeof CheckCircle; iconColor: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800',
    icon: AlertCircle,
    iconColor: 'text-red-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    icon: Info,
    iconColor: 'text-blue-500',
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: RemoveToast }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const dur = toast.duration ?? 4000;
    if (dur <= 0) return;
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 200);
    }, dur);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, toast.duration, onRemove]);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }, [toast.id, onRemove]);

  const { bg, icon: Icon, iconColor } = VARIANT_STYLES[toast.variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border p-3 shadow-lg transition-all duration-200 ${bg} ${
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
