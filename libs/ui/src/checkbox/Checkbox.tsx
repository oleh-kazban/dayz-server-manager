import {
  type ChangeEvent,
  type FocusEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react';

export interface CheckboxProps {
  /**
   * React 19 ref forwarded directly to the native <input> element.
   */
  ref?: Ref<HTMLInputElement>;

  /**
   * Controlled checked state.
   */
  checked?: boolean;

  /**
   * Initial uncontrolled checked state.
   */
  defaultChecked?: boolean;

  /**
   * Tri-state indeterminate visual and accessibility state.
   * @default false
   */
  indeterminate?: boolean;

  /**
   * Callback fired when checked state changes.
   */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;

  /**
   * Focus event callbacks.
   */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;

  /**
   * Form control identification and state.
   */
  id?: string;
  name?: string;
  value?: string | number | readonly string[];
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  tabIndex?: number;

  /**
   * Primary label text or element.
   */
  label?: ReactNode;

  /**
   * Secondary explanatory description text.
   */
  description?: ReactNode;

  /**
   * Error message displayed beneath the checkbox.
   */
  error?: string;

  /**
   * Accessibility attributes.
   */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;

  /**
   * Styling overrides.
   */
  className?: string;
  containerClassName?: string;
  customClassName?: string;
}

export function Checkbox({
  ref,
  id: externalId,
  name,
  value,
  checked,
  defaultChecked,
  indeterminate = false,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  autoFocus,
  tabIndex,
  label,
  description,
  error,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': externalDescribedBy,
  containerClassName = '',
  customClassName = '',
  className = '',
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;

  const internalInputRef = useRef<HTMLInputElement>(null);

  const handleInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      internalInputRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as RefObject<HTMLInputElement | null>).current = element;
      }
    },
    [ref],
  );

  useEffect(() => {
    if (internalInputRef.current) {
      internalInputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  const describedByParts = [
    externalDescribedBy,
    description ? descriptionId : null,
    error ? errorId : null,
  ].filter(Boolean);
  const computedDescribedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;
  const resolvedContainerClass = containerClassName || customClassName;

  return (
    <div className={`space-y-1 ${resolvedContainerClass}`}>
      <div className={`flex gap-2.5 ${description ? 'items-start' : 'items-center'}`}>
        <input
          ref={handleInputRef}
          id={inputId}
          name={name}
          type="checkbox"
          value={value}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
          aria-checked={indeterminate ? 'mixed' : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={computedDescribedBy}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={`w-4 h-4 rounded border border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)] focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] shrink-0 transition-opacity ${
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
              <span
                id={descriptionId}
                className="block text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-normal"
              >
                {description}
              </span>
            )}
          </label>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] text-[var(--color-status-danger)] leading-tight pl-6.5"
        >
          {error}
        </p>
      )}
    </div>
  );
}
