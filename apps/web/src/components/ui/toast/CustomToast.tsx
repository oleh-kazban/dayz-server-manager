import { type Toast, toast } from 'react-hot-toast';

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface CustomToastProps {
  t: Toast;
  title: string;
  description?: string;
  type?: ToastType;
}

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'success':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      );
    case 'error':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
          <AlertCircle className="h-4 w-4" />
        </div>
      );
    case 'warning':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
          <AlertTriangle className="h-4 w-4" />
        </div>
      );
    case 'info':
    default:
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          <Info className="h-4 w-4" />
        </div>
      );
  }
}

export function CustomToast({ t, title, description, type = 'info' }: CustomToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${
        t.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      } pointer-events-auto flex w-full max-w-sm transform items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 text-[var(--color-text-main)] shadow-[var(--shadow-card)] transition-all duration-200`}
    >
      <ToastIcon type={type} />
      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-semibold leading-tight text-[var(--color-text-main)]">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => toast.dismiss(t.id)}
        className="shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
