import { ReactNode, useId } from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: string;
  error?: string;
  containerClassName?: string;
}

export function Checkbox({
  ref,
  id: externalId,
  label,
  description,
  error,
  disabled = false,
  containerClassName = '',
  className = '',
  ...props
}: CheckboxProps & { ref?: React.Ref<HTMLInputElement> }) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      <div className={`flex gap-2.5 ${description ? 'items-start' : 'items-center'}`}>
        <input
          {...props}
          ref={ref}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          aria-disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-[15px] h-[15px] rounded border border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] focus:ring-0 shrink-0 transition-opacity ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          } ${description ? 'mt-0.5' : ''} ${className}`}
        />
        {label && (
          <label
            htmlFor={inputId}
            className={`text-[11px] select-none ${
              disabled
                ? 'cursor-not-allowed opacity-50 text-[var(--color-text-muted)]'
                : 'cursor-pointer text-[var(--color-text-secondary)]'
            } ${description ? 'leading-tight' : 'leading-none'}`}
          >
            {label}
            {description && (
              <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-normal">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-[11px] text-[var(--color-danger)] leading-tight pl-6"
        >
          {error}
        </p>
      )}
    </div>
  );
}
