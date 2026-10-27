import { type ElementType, isValidElement } from 'react';

import type {
  StatusTagDomainStatus,
  StatusTagIcon,
  StatusTagProps,
  StatusTagSemanticStatus,
  StatusTagShape,
  StatusTagStatus,
  StatusTagVariant,
} from './StatusTag.types';

export type {
  StatusTagDomainStatus,
  StatusTagIcon,
  StatusTagProps,
  StatusTagSemanticStatus,
  StatusTagShape,
  StatusTagStatus,
  StatusTagVariant,
};

/* --------------------------------------------------------------------------
   STYLE CONFIGURATIONS (2-Tier Density & 100% Token Mappings)
   -------------------------------------------------------------------------- */

const STATUS_ALIAS_MAP: Record<StatusTagStatus, StatusTagSemanticStatus> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  neutral: 'neutral',
  primary: 'primary',
  online: 'success',
  offline: 'neutral',
  restarting: 'warning',
  stopped: 'neutral',
};

const STATUS_DEFAULT_LABELS: Partial<Record<StatusTagStatus, string>> = {
  online: 'Online',
  offline: 'Offline',
  restarting: 'Restarting',
  stopped: 'Stopped',
};

const SHAPE_CLASSES: Record<StatusTagShape, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-full',
};

const SUBTLE_CLASSES: Record<StatusTagSemanticStatus, string> = {
  success:
    'border-[var(--color-status-success-border)] bg-[var(--color-status-success-light)] text-[var(--color-status-success)]',
  warning:
    'border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-light)] text-[var(--color-status-warning)]',
  danger:
    'border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-light)] text-[var(--color-status-danger)]',
  info: 'border-[var(--color-status-info-border)] bg-[var(--color-status-info-light)] text-[var(--color-status-info)]',
  neutral:
    'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]',
  primary:
    'border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-[var(--color-primary)]',
};

const SOLID_CLASSES: Record<StatusTagSemanticStatus, string> = {
  success: 'bg-[var(--color-status-success)] text-white border-transparent shadow-xs',
  warning:
    'bg-[var(--color-status-warning)] text-[var(--color-status-warning-fg)] border-transparent shadow-xs',
  danger:
    'bg-[var(--color-status-danger)] text-[var(--color-status-danger-fg)] border-transparent shadow-xs',
  info: 'bg-[var(--color-status-info)] text-white border-transparent shadow-xs',
  neutral:
    'bg-[var(--color-surface-hover)] text-[var(--color-text-main)] border-[var(--color-border)] shadow-xs',
  primary: 'bg-[var(--color-primary)] text-white border-transparent shadow-xs',
};

const OUTLINE_CLASSES: Record<StatusTagSemanticStatus, string> = {
  success: 'border-[var(--color-status-success)] bg-transparent text-[var(--color-status-success)]',
  warning: 'border-[var(--color-status-warning)] bg-transparent text-[var(--color-status-warning)]',
  danger: 'border-[var(--color-status-danger)] bg-transparent text-[var(--color-status-danger)]',
  info: 'border-[var(--color-status-info)] bg-transparent text-[var(--color-status-info)]',
  neutral: 'border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)]',
  primary: 'border-[var(--color-primary)] bg-transparent text-[var(--color-primary)]',
};

const DOT_COLOR_CLASSES: Record<StatusTagSemanticStatus, Record<StatusTagVariant, string>> = {
  success: {
    subtle: 'bg-[var(--color-status-success)]',
    solid: 'bg-white',
    outline: 'bg-[var(--color-status-success)]',
  },
  warning: {
    subtle: 'bg-[var(--color-status-warning)]',
    solid: 'bg-[var(--color-status-warning-fg)]',
    outline: 'bg-[var(--color-status-warning)]',
  },
  danger: {
    subtle: 'bg-[var(--color-status-danger)]',
    solid: 'bg-white',
    outline: 'bg-[var(--color-status-danger)]',
  },
  info: {
    subtle: 'bg-[var(--color-status-info)]',
    solid: 'bg-white',
    outline: 'bg-[var(--color-status-info)]',
  },
  neutral: {
    subtle: 'bg-[var(--color-text-muted)]',
    solid: 'bg-current',
    outline: 'bg-[var(--color-text-muted)]',
  },
  primary: {
    subtle: 'bg-[var(--color-primary)]',
    solid: 'bg-white',
    outline: 'bg-[var(--color-primary)]',
  },
};

function getStatusTagColorClass(
  variant: StatusTagVariant,
  status: StatusTagSemanticStatus,
): string {
  if (variant === 'solid') {
    return SOLID_CLASSES[status];
  }
  if (variant === 'outline') {
    return OUTLINE_CLASSES[status];
  }
  return SUBTLE_CLASSES[status];
}

function renderStatusTagIcon(icon: StatusTagIcon | undefined) {
  if (!icon) return null;

  if (isValidElement(icon)) {
    return icon;
  }

  const IconComponent = icon as ElementType;
  return <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
}

/* --------------------------------------------------------------------------
   STATUS TAG COMPONENT
   -------------------------------------------------------------------------- */

export function StatusTag({
  ref,
  status,
  variant = 'subtle',
  shape = 'rounded',
  ping,
  rightIcon,
  uppercase = false,
  mono = false,
  className = '',
  customClassName = '',
  children,
  role = 'status',
  ...props
}: StatusTagProps) {
  const semanticStatus = STATUS_ALIAS_MAP[status] ?? 'neutral';
  const colorClass = getStatusTagColorClass(variant, semanticStatus);
  const dotColorClass = DOT_COLOR_CLASSES[semanticStatus][variant];
  const mergedClass = customClassName || className;
  const isRestarting = status === 'restarting';
  const shouldPing = ping !== undefined ? ping : isRestarting;
  const renderedContent = children ?? STATUS_DEFAULT_LABELS[status];

  return (
    <span
      {...props}
      ref={ref}
      role={role}
      className={`inline-flex items-center w-fit border font-semibold select-none transition-colors h-6 text-xs px-2.5 gap-2 leading-none ${
        SHAPE_CLASSES[shape]
      } ${colorClass} ${
        uppercase ? 'uppercase tracking-wider' : ''
      } ${mono ? 'font-mono' : ''} ${mergedClass}`.trim()}
    >
      {/* Telemetry Status Dot Indicator */}
      <span
        className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {shouldPing && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColorClass}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColorClass}`} />
      </span>

      {/* Content */}
      {renderedContent && <span className="truncate">{renderedContent}</span>}

      {/* Optional Trailing Icon */}
      {renderStatusTagIcon(rightIcon)}
    </span>
  );
}
