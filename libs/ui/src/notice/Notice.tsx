import { isValidElement, type ReactNode } from 'react';

import { AlertTriangle, CheckCircle2, CircleAlert, Info, type LucideIcon, X } from 'lucide-react';

import { type NoticeProps } from './Notice.types';

type NormalizedVariant = 'info' | 'warning' | 'error' | 'success';

interface VariantTheme {
  containerClasses: string;
  iconClasses: string;
  defaultIcon: LucideIcon;
  role: 'alert' | 'status';
  ariaLive: 'assertive' | 'polite';
}

const THEMES: Record<NormalizedVariant, VariantTheme> = {
  info: {
    containerClasses:
      'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30 text-[var(--color-text-main)]',
    iconClasses: 'text-[var(--color-primary)]',
    defaultIcon: Info,
    role: 'status',
    ariaLive: 'polite',
  },
  warning: {
    containerClasses:
      'bg-[var(--color-status-warning)]/10 border-[var(--color-status-warning)]/30 text-[var(--color-text-main)]',
    iconClasses: 'text-[var(--color-status-warning)]',
    defaultIcon: AlertTriangle,
    role: 'alert',
    ariaLive: 'polite',
  },
  error: {
    containerClasses:
      'bg-[var(--color-status-danger)]/10 border-[var(--color-status-danger)]/30 text-[var(--color-text-main)]',
    iconClasses: 'text-[var(--color-status-danger)]',
    defaultIcon: CircleAlert,
    role: 'alert',
    ariaLive: 'assertive',
  },
  success: {
    containerClasses:
      'bg-[var(--color-status-success)]/10 border-[var(--color-status-success)]/30 text-[var(--color-text-main)]',
    iconClasses: 'text-[var(--color-status-success)]',
    defaultIcon: CheckCircle2,
    role: 'status',
    ariaLive: 'polite',
  },
};

function resolveIcon(icon: NoticeProps['icon'], theme: VariantTheme): ReactNode {
  if (icon === false) {
    return null;
  }
  if (isValidElement(icon)) {
    return icon;
  }
  if (typeof icon === 'function') {
    const CustomIcon = icon as LucideIcon;
    return <CustomIcon aria-hidden="true" className="w-4 h-4 shrink-0" />;
  }
  const DefaultIcon = theme.defaultIcon;
  return <DefaultIcon aria-hidden="true" className="w-4 h-4 shrink-0" />;
}

export function Notice({
  ref,
  variant = 'info',
  title,
  children,
  icon,
  action,
  onClose,
  closeLabel = 'Dismiss notice',
  className = '',
  role: customRole,
  ...props
}: NoticeProps) {
  const normalizedVariant: NormalizedVariant = variant === 'danger' ? 'error' : variant;
  const theme = THEMES[normalizedVariant];
  const renderedIcon = resolveIcon(icon, theme);
  const activeRole = customRole ?? theme.role;

  return (
    <div
      ref={ref}
      role={activeRole}
      aria-live={theme.ariaLive}
      className={`relative flex items-start gap-3 p-3.5 rounded-xl border text-xs font-sans transition-all shadow-xs ${theme.containerClasses} ${className}`.trim()}
      {...props}
    >
      {renderedIcon && (
        <span className={`shrink-0 mt-0.5 ${theme.iconClasses}`}>{renderedIcon}</span>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        {title && (
          <h5 className="font-semibold text-[var(--color-text-main)] leading-snug">{title}</h5>
        )}
        {children && (
          <div className="text-[var(--color-text-secondary)] leading-relaxed">{children}</div>
        )}
        {action && <div className="pt-1.5">{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface)]/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
