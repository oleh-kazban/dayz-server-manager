import type { Ref } from 'react';

import type { Alignment } from '../hooks';

export interface DatePickerProps {
  /** Form field identifier */
  id?: string;

  /** Name for form serialization */
  name?: string;

  /** Selected date in ISO format ('YYYY-MM-DD') */
  value?: string;

  /** Minimum selectable date ('YYYY-MM-DD') */
  minDate?: string;

  /** Maximum selectable date ('YYYY-MM-DD') */
  maxDate?: string;

  /** Trigger placeholder label */
  placeholder?: string;

  /** Label displayed above the date picker trigger */
  label?: string;

  /** Validation error message; renders field in danger state and links aria-describedby */
  error?: string;

  /** Screen reader accessible label */
  ariaLabel?: string;

  /** Popup alignment relative to trigger */
  alignment?: Alignment;

  /** Disables trigger and suppresses popup */
  disabled?: boolean;

  /** Enables native required-value validation within a form */
  required?: boolean;

  /** Root container styling escape hatch */
  customClassName?: string;

  /** Standard container styling escape hatch */
  containerClassName?: string;

  /** Change callback with ISO date string or undefined when cleared */
  onChange: (value: string | undefined) => void;

  /** Blur event handler */
  onBlur?: () => void;

  /** React 19 native ref targeting the trigger button */
  ref?: Ref<HTMLButtonElement>;
}
