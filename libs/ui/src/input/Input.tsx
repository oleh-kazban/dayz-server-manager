import { type MouseEvent, useId, useRef } from 'react';

import type { InputProps } from './Input.types';

export type { InputProps };

export function Input({
  ref,
  leftIcon: LeftIcon,
  rightAction,
  id: externalId,
  label,
  error,
  disabled = false,
  className = '',
  customClassName = '',
  containerClassName = '',
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;

  const internalInputRef = useRef<HTMLInputElement>(null);

  const handleInputRef = (element: HTMLInputElement | null) => {
    internalInputRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && 'current' in ref) {
      (ref as { current: HTMLInputElement | null }).current = element;
    }
  };

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    internalInputRef.current?.focus();
  };

  const resolvedContainerClass = containerClassName || customClassName || '';

  return (
    <div className={`space-y-1.5 text-left ${resolvedContainerClass}`.trim()}>
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-xs font-medium select-none ${
            disabled
              ? 'cursor-not-allowed opacity-50 text-[var(--color-text-muted)]'
              : 'text-[var(--color-text-main)]'
          }`}
        >
          {label}
        </label>
      )}

      <div
        onClick={handleContainerClick}
        className={`flex items-center rounded-lg border bg-[var(--color-surface)] shadow-xs transition-colors cursor-text h-9 px-3.5 gap-2.5 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-[var(--color-surface-subtle)]' : ''
        } ${
          error
            ? 'border-[var(--color-status-danger)] focus-within:border-[var(--color-status-danger)] focus-within:ring-1 focus-within:ring-[var(--color-status-danger)]'
            : 'border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]'
        }`}
      >
        {LeftIcon && (
          <LeftIcon
            aria-hidden="true"
            className={`w-4 h-4 text-[var(--color-text-muted)] shrink-0 select-none ${
              disabled ? 'opacity-50' : ''
            }`}
          />
        )}

        <input
          {...props}
          ref={handleInputRef}
          id={inputId}
          disabled={disabled}
          aria-disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full h-full min-w-0 self-stretch bg-transparent border-0 p-0 font-sans text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed ${className}`.trim()}
        />

        {rightAction && <div className="shrink-0 flex items-center">{rightAction}</div>}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="text-[11px] font-sans text-[var(--color-status-danger)] leading-tight"
        >
          {error}
        </p>
      )}
    </div>
  );
}
