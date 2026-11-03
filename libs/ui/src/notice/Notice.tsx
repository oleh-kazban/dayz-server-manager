import { type ComponentType, isValidElement, type ReactNode, useId } from 'react';

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
      'border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-[var(--color-primary)]',
    iconClasses: 'text-[var(--color-primary)]',
    defaultIcon: Info,
    role: 'status',
    ariaLive: 'polite',
  },
  warning: {
    containerClasses:
      'border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-light)] text-[var(--color-status-warning)]',
    iconClasses: 'text-[var(--color-status-warning)]',
    defaultIcon: AlertTriangle,
    role: 'alert',
    ariaLive: 'polite',
  },
  error: {
    containerClasses:
      'border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-light)] text-[var(--color-status-danger)]',
    iconClasses: 'text-[var(--color-status-danger)]',
    defaultIcon: CircleAlert,
    role: 'alert',
    ariaLive: 'assertive',
  },
  success: {
    containerClasses:
      'border-[var(--color-status-success-border)] bg-[var(--color-status-success-light)] text-[var(--color-status-success)]',
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
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon))
  ) {
    const CustomIcon = icon as ComponentType<{
      className?: string;
      'aria-hidden'?: boolean | 'true' | 'false';
    }>;
    return <CustomIcon aria-hidden={true} className="w-4 h-4 shrink-0" />;
  }
  const DefaultIcon = theme.defaultIcon;
  return <DefaultIcon aria-hidden={true} className="w-4 h-4 shrink-0" />;
}

export function Notice({
  ref,
  id,
  variant = 'info',
  title,
  children,
  icon,
  action,
  onClose,
  closeLabel = 'Dismiss notice',
  className = '',
  role: customRole,
}: NoticeProps) {
  const generatedId = useId();
  const titleId = id ? `${id}-title` : `notice-title-${generatedId}`;
  const normalizedVariant: NormalizedVariant = variant === 'danger' ? 'error' : variant;
  const theme = THEMES[normalizedVariant];
  const renderedIcon = resolveIcon(icon, theme);
  const activeRole = customRole ?? theme.role;

  return (
    <div
      ref={ref}
      id={id}
      role={activeRole}
      aria-live={theme.ariaLive}
      aria-labelledby={title ? titleId : undefined}
      className={`relative flex items-start gap-3 p-3.5 rounded-xl border text-xs font-sans transition-all shadow-xs ${theme.containerClasses} ${className}`.trim()}
    >
      {renderedIcon && (
        <span className={`shrink-0 mt-0.5 ${theme.iconClasses}`}>{renderedIcon}</span>
      )}

      <div className="flex-1 min-w-0 space-y-1">
        {title && (
          <h5 id={titleId} className="font-semibold text-[var(--color-text-main)] leading-snug">
            {title}
          </h5>
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
          className="shrink-0 -mr-2 -mt-2 h-9 w-9 inline-flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
