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
          className="block text-xs font-medium text-[var(--color-text-main)]"
        >
          {label}
        </label>
      )}

      <div
        className={`flex items-center gap-3 h-12 px-3.5 rounded-lg border bg-[var(--color-surface-subtle)] transition-colors ${
          error
            ? 'border-[var(--color-danger)] focus-within:border-[var(--color-danger)]'
            : 'border-[var(--color-border)] focus-within:border-[var(--color-primary)]'
        }`}
      >
        {LeftIcon && (
          <LeftIcon className="w-[17px] h-[17px] text-[var(--color-text-muted)] shrink-0" />
        )}

        <input
          {...props}
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full bg-transparent text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none ${className}`}
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
