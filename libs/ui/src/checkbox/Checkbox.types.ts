import type { ChangeEvent, FocusEvent, ReactNode, Ref } from 'react';

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
