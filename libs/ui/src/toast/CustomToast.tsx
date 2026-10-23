import { type Toast, toast } from 'react-hot-toast';

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface CustomToastProps {
  t: Toast;
  title: string;
  description?: string;
  type?: ToastType;
}

const TOAST_STYLES: Record<
  ToastType,
  {
    container: string;
    iconColor: string;
  }
> = {
  success: {
    container: 'border-[var(--color-success-border)] bg-[var(--color-success-light)]',
    iconColor: 'text-[var(--color-success)]',
  },
  info: {
    container: 'border-[var(--color-primary-border)] bg-[var(--color-primary-light)]',
    iconColor: 'text-[var(--color-primary)]',
  },
  warning: {
    container: 'border-[var(--color-warning-border)] bg-[var(--color-warning-light)]',
    iconColor: 'text-[var(--color-warning)]',
  },
  error: {
    container: 'border-[var(--color-danger-border)] bg-[var(--color-danger-light)]',
    iconColor: 'text-[var(--color-danger)]',
  },
};

function ToastIcon({ type }: { type: ToastType }) {
  const styles = TOAST_STYLES[type] ?? TOAST_STYLES.info;

  const IconComponent =
    {
      success: CheckCircle2,
      error: AlertCircle,
      warning: AlertTriangle,
      info: Info,
    }[type] ?? Info;

  return (
    <div className={`shrink-0 pt-0.5 ${styles.iconColor}`}>
      <IconComponent className="h-5 w-5" />
    </div>
  );
}

export function CustomToast({ t, title, description, type = 'info' }: CustomToastProps) {
  const styles = TOAST_STYLES[type] ?? TOAST_STYLES.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${
        t.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      } pointer-events-auto flex w-full max-w-sm transform items-start gap-3 rounded-2xl border ${
        styles.container
      } p-3.5 text-[var(--color-text-main)] shadow-[var(--shadow-card)] transition-all duration-200`}
    >
      <ToastIcon type={type} />
      <div className="min-w-0 flex-1">
        <h3 className="text-xs font-semibold leading-tight text-[var(--color-text-main)]">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => toast.dismiss(t.id)}
        className="shrink-0 rounded-lg p-1 text-[var(--color-text-muted)] transition-colors hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--color-text-main)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
