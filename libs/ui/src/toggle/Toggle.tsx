import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  useId,
  useState,
} from 'react';

export type ToggleSize = 'sm' | 'md' | 'lg';

export type ToggleColor = 'primary' | 'success' | 'danger';

export interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'color' | 'type'> {
  label?: ReactNode;
  description?: ReactNode;
  labelPosition?: 'left' | 'right';
  size?: ToggleSize;
  color?: ToggleColor;
  containerClassName?: string;
  trackClassName?: string;
  knobClassName?: string;
}

/* --------------------------------------------------------------------------
   STYLE CONFIGURATIONS
   -------------------------------------------------------------------------- */

const TRACK_SIZE_CLASSES: Record<ToggleSize, string> = {
  sm: 'w-7 h-4 p-0.5',
  md: 'w-8 h-[18px] p-0.5',
  lg: 'w-11 h-6 p-0.5',
};

const KNOB_SIZE_CLASSES: Record<ToggleSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-5 h-5',
};

const KNOB_TRANSLATE_CLASSES: Record<ToggleSize, string> = {
  sm: 'translate-x-3',
  md: 'translate-x-3.5',
  lg: 'translate-x-5',
};

const COLOR_CHECKED_CLASSES: Record<ToggleColor, string> = {
  primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]',
  success: 'bg-emerald-500 hover:bg-emerald-600',
  danger: 'bg-rose-500 hover:bg-rose-600',
};

const LABEL_SIZE_CLASSES: Record<ToggleSize, string> = {
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-sm',
};

/* --------------------------------------------------------------------------
   TOGGLE COMPONENT
   -------------------------------------------------------------------------- */

export function Toggle({
  ref,
  id: externalId,
  checked: externalChecked,
  defaultChecked,
  disabled = false,
  label,
  description,
  labelPosition = 'left',
  size = 'md',
  color = 'primary',
  containerClassName = '',
  trackClassName = '',
  knobClassName = '',
  className = '',
  onChange,
  ...props
}: ToggleProps & { ref?: Ref<HTMLInputElement> }) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;

  const isControlled = externalChecked !== undefined;
  const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
  const isChecked = isControlled ? externalChecked : internalChecked;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (!isControlled) {
      setInternalChecked(e.target.checked);
    }
    onChange?.(e);
  };

  const trackBgClass = isChecked
    ? COLOR_CHECKED_CLASSES[color]
    : 'bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400 dark:hover:bg-zinc-600';

  const knobTranslateClass = isChecked ? KNOB_TRANSLATE_CLASSES[size] : 'translate-x-0';

  const labelContent = (label || description) && (
    <span className={`select-none ${LABEL_SIZE_CLASSES[size]}`}>
      {label && (
        <span
          className={`font-medium ${
            isChecked ? 'text-[var(--color-text-main)]' : 'text-[var(--color-text-secondary)]'
          }`}
        >
          {label}
        </span>
      )}
      {description && (
        <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-normal">
          {description}
        </span>
      )}
    </span>
  );

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex items-center gap-2 select-none cursor-pointer group ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${containerClassName}`}
    >
      {/* Hidden Accessible Checkbox Input */}
      <input
        {...props}
        ref={ref}
        id={inputId}
        type="checkbox"
        role="switch"
        aria-checked={isChecked}
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        className={`sr-only ${className}`}
      />

      {/* Optional Left Label */}
      {labelPosition === 'left' && labelContent}

      {/* Visual Toggle Track */}
      <span
        aria-hidden="true"
        className={`relative inline-flex shrink-0 rounded-full cursor-pointer transition-colors duration-200 ease-in-out group-focus-within:ring-2 group-focus-within:ring-[var(--color-primary)] group-focus-within:ring-offset-2 ${
          TRACK_SIZE_CLASSES[size]
        } ${trackBgClass} ${trackClassName}`}
      >
        {/* Visual Sliding Knob */}
        <span
          className={`inline-block rounded-full bg-white shadow-sm pointer-events-none transform transition-transform duration-200 ease-in-out group-active:scale-95 ${
            KNOB_SIZE_CLASSES[size]
          } ${knobTranslateClass} ${knobClassName}`}
        />
      </span>

      {/* Optional Right Label */}
      {labelPosition === 'right' && labelContent}
    </label>
  );
}
