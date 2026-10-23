import { useId } from 'react';

import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: LucideIcon;
  rightAction?: React.ReactNode;
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  ref,
  leftIcon: LeftIcon,
  rightAction,
  id: externalId,
  label,
  error,
  disabled = false,
  containerClassName = '',
  className = '',
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;

  return (
    <div className={`space-y-2 text-left ${containerClassName}`}>
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
        className={`flex items-center gap-3 h-12 px-3.5 rounded-lg border transition-colors ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-[var(--color-surface-subtle)]/60'
            : 'bg-[var(--color-surface-subtle)]'
        } ${
          error
            ? 'border-[var(--color-danger)] focus-within:border-[var(--color-danger)]'
            : 'border-[var(--color-border)] focus-within:border-[var(--color-primary)]'
        }`}
      >
        {LeftIcon && (
          <LeftIcon
            className={`w-[17px] h-[17px] text-[var(--color-text-muted)] shrink-0 ${
              disabled ? 'opacity-50' : ''
            }`}
          />
        )}

        <input
          {...props}
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full bg-transparent text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none disabled:cursor-not-allowed ${className}`}
        />

        {rightAction}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-[11px] text-[var(--color-danger)] leading-tight">
          {error}
        </p>
      )}
    </div>
  );
}
