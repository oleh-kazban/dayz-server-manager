import { useId } from 'react';

import {
  type ProgressBarProps,
  type ProgressBarSize,
  type ProgressBarVariant,
} from './ProgressBar.types';

const SIZE_CLASSES: Record<ProgressBarSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const VARIANT_CLASSES: Record<ProgressBarVariant, string> = {
  primary: 'bg-[var(--color-primary)]',
  success: 'bg-[var(--color-status-success)]',
  warning: 'bg-[var(--color-status-warning)]',
  danger: 'bg-[var(--color-status-danger)]',
  info: 'bg-[var(--color-primary)]',
};

export function ProgressBar({
  ref,
  value = 0,
  max = 100,
  min = 0,
  indeterminate = false,
  variant = 'primary',
  size = 'md',
  label,
  showValue = false,
  valueLabel,
  helperText,
  'aria-label': ariaLabel,
  className = '',
  trackClassName = '',
  barClassName = '',
  containerClassName = '',
  customClassName = '',
  ...props
}: ProgressBarProps) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;

  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : 100;
  const safeVal = Number.isFinite(value) ? Math.min(safeMax, Math.max(safeMin, value)) : safeMin;

  const percentage = indeterminate
    ? 0
    : Math.round(((safeVal - safeMin) / (safeMax - safeMin)) * 100);

  const displayedValue = valueLabel ?? (showValue && !indeterminate ? `${percentage}%` : null);

  const resolvedContainerClass = containerClassName || customClassName || '';
  const trackHeightClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  const barColorClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary;

  const valueText = typeof displayedValue === 'string' ? displayedValue : `${percentage}%`;

  return (
    <div
      ref={ref}
      className={`space-y-1.5 w-full text-left font-sans ${resolvedContainerClass} ${className}`.trim()}
      {...props}
    >
      {(label || displayedValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <span
              id={labelId}
              className="font-medium text-[var(--color-text-main)] truncate select-none"
            >
              {label}
            </span>
          )}
          {displayedValue && (
            <span className="font-mono text-[11px] text-[var(--color-text-secondary)] shrink-0 ml-2 select-none">
              {displayedValue}
            </span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-labelledby={label ? labelId : undefined}
        aria-label={ariaLabel}
        aria-valuenow={indeterminate ? undefined : safeVal}
        aria-valuemin={indeterminate ? undefined : safeMin}
        aria-valuemax={indeterminate ? undefined : safeMax}
        aria-valuetext={indeterminate ? undefined : valueText}
        className={`relative w-full overflow-hidden rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)]/50 ${trackHeightClass} ${trackClassName}`.trim()}
      >
        {indeterminate ? (
          <div
            className={`h-full w-2/5 rounded-full animate-progress-indeterminate ${barColorClass} ${barClassName}`}
          />
        ) : (
          <div
            style={{ width: `${percentage}%` }}
            className={`h-full rounded-full transition-all duration-300 ease-out ${barColorClass} ${barClassName}`}
          />
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-[var(--color-text-muted)] leading-tight select-none">
          {helperText}
        </p>
      )}
    </div>
  );
}
