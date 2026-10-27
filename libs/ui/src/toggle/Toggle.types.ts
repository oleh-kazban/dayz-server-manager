import type { ChangeEvent, FocusEvent, ReactNode, Ref } from 'react';

export type ToggleColor = 'primary' | 'success' | 'danger';

export interface ToggleProps {
  /**
   * React 19 ref forwarded directly to the native <input> switch element.
   */
  ref?: Ref<HTMLInputElement>;

  /**
   * Controlled checked state.
   */
  checked?: boolean;

  /**
   * Uncontrolled initial checked state.
   */
  defaultChecked?: boolean;

  /**
   * Disables switch interactions and dims opacity.
   * @default false
   */
  disabled?: boolean;

  /**
   * Form control name.
   */
  name?: string;

  /**
   * Value attribute for form submissions.
   */
  value?: string;

  /**
   * Explicit element id (auto-generated if omitted).
   */
  id?: string;

  /**
   * Primary label text or element.
   */
  label?: ReactNode;

  /**
   * Supplementary explanatory description linked via aria-describedby.
   */
  description?: ReactNode;

  /**
   * Placement of the label relative to the switch track.
   * @default 'left'
   */
  labelPosition?: 'left' | 'right';

  /**
   * Active color variant for the checked track.
   * @default 'primary'
   */
  color?: ToggleColor;

  /**
   * Change event callback.
   */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;

  /**
   * Focus event callbacks.
   */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;

  /**
   * Accessible label for screen readers when no visual label is present.
   */
  ariaLabel?: string;
  'aria-label'?: string;

  /**
   * Explicit ID for aria-describedby linkage.
   */
  ariaDescribedBy?: string;
  'aria-describedby'?: string;

  /**
   * Single external class escape hatch for container positioning.
   */
  customClassName?: string;

  /**
   * Standard container styling escape hatch.
   */
  containerClassName?: string;
}
