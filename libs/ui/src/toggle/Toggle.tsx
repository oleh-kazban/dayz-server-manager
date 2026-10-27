import { type ChangeEvent, useId, useState } from 'react';

import type { ToggleColor, ToggleProps } from './Toggle.types';

/* --------------------------------------------------------------------------
   STYLE CONFIGURATIONS (DSM Token Mappings)
   -------------------------------------------------------------------------- */

const COLOR_ACTIVE_CLASSES: Record<ToggleColor, string> = {
  primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]',
  success: 'bg-[var(--color-status-success)] hover:bg-[var(--color-status-success-border)]',
  danger: 'bg-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-border)]',
};

function getTrackBackgroundClass(
  isChecked: boolean,
  disabled: boolean,
  color: ToggleColor,
): string {
  if (isChecked) {
    if (disabled) {
      return COLOR_ACTIVE_CLASSES[color].split(' ')[0];
    }
    return COLOR_ACTIVE_CLASSES[color];
  }

  if (disabled) {
    return 'bg-[var(--color-border)]';
  }

  return 'bg-[var(--color-border-hover)] hover:bg-[var(--color-border)]';
}

/* --------------------------------------------------------------------------
   TOGGLE COMPONENT
   -------------------------------------------------------------------------- */

export function Toggle({
  ref,
  id: externalId,
  checked: externalChecked,
  defaultChecked,
  disabled = false,
  name,
  value,
  label,
  description,
  labelPosition = 'left',
  color = 'primary',
  onChange,
  onBlur,
  onFocus,
  ariaLabel,
  'aria-label': ariaLabelAttr,
  ariaDescribedBy,
  'aria-describedby': ariaDescribedByAttr,
  customClassName = '',
  containerClassName = '',
}: ToggleProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const descriptionId = description ? `${inputId}-desc` : undefined;

  const isControlled = externalChecked !== undefined;
  const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
  const isChecked = isControlled ? externalChecked : internalChecked;

  const effectiveAriaLabel = ariaLabel ?? ariaLabelAttr;
  const effectiveAriaDescribedBy = ariaDescribedBy ?? ariaDescribedByAttr ?? descriptionId;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!isControlled) {
      setInternalChecked(e.target.checked);
    }
    onChange?.(e);
  };

  const trackBgClass = getTrackBackgroundClass(isChecked, disabled, color);
  const knobTranslateClass = isChecked ? 'translate-x-3.5' : 'translate-x-0';

  const labelContent = (label || description) && (
    <span className="select-none text-xs font-sans">
      {label && (
        <span
          className={`font-medium transition-colors ${
            isChecked ? 'text-[var(--color-text-main)]' : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {label}
        </span>
      )}
      {description && (
        <span
          id={descriptionId}
          className="block text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-normal"
        >
          {description}
        </span>
      )}
    </span>
  );

  const resolvedContainerClass = containerClassName || customClassName || '';

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex items-center gap-2.5 select-none ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${resolvedContainerClass}`.trim()}
    >
      {/* Hidden Accessible Checkbox Input */}
      <input
        ref={ref}
        id={inputId}
        name={name}
        value={value}
        type="checkbox"
        role="switch"
        aria-checked={isChecked}
        aria-label={effectiveAriaLabel}
        aria-describedby={effectiveAriaDescribedBy}
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        className="peer sr-only"
      />

      {/* Optional Left Label */}
      {labelPosition === 'left' && labelContent}

      {/* Visual Toggle Track */}
      <span
        aria-hidden="true"
        className={`relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-in-out peer-focus-visible:ring-1 peer-focus-visible:ring-[var(--color-primary)] peer-focus-visible:ring-offset-1 w-8 h-[18px] p-0.5 ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        } ${trackBgClass}`}
      >
        {/* Visual Sliding Knob */}
        <span
          className={`inline-block rounded-full bg-white shadow-xs pointer-events-none transform transition-transform duration-200 ease-in-out w-3.5 h-3.5 ${
            disabled ? '' : 'active:scale-95'
          } ${knobTranslateClass}`}
        />
      </span>

      {/* Optional Right Label */}
      {labelPosition === 'right' && labelContent}
    </label>
  );
}
