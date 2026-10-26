import { type HTMLAttributes, type ReactNode, type Ref } from 'react';

export type ProgressBarVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

export type ProgressBarSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** React 19 native DOM ref forwarded to the root container */
  ref?: Ref<HTMLDivElement>;

  /**
   * Current numeric progress value.
   * Clamped between min and max.
   * @default 0
   */
  value?: number;

  /**
   * Maximum progress boundary.
   * @default 100
   */
  max?: number;

  /**
   * Minimum progress boundary.
   * @default 0
   */
  min?: number;

  /**
   * Enables continuous indeterminate sliding animation.
   * Suppresses numeric aria-valuenow per W3C specification.
   * @default false
   */
  indeterminate?: boolean;

  /**
   * Semantic color variant for the active progress indicator.
   * @default 'primary'
   */
  variant?: ProgressBarVariant;

  /**
   * Dimensional scale controlling track thickness.
   * 'sm' = 4px, 'md' = 8px, 'lg' = 12px.
   * @default 'md'
   */
  size?: ProgressBarSize;

  /** Optional label rendered above the track on the left */
  label?: ReactNode;

  /**
   * Whether to display the formatted percentage text above the track on the right.
   * @default false
   */
  showValue?: boolean;

  /**
   * Custom value label rendered above the track on the right (e.g. "4.2 GB / 6.8 GB").
   * Overrides default percentage display.
   */
  valueLabel?: ReactNode;

  /** Optional supporting description text rendered below the track */
  helperText?: ReactNode;

  /** Accessibility label for screen readers when visible label is absent */
  'aria-label'?: string;

  /** Styling escape hatch for the inner track element */
  trackClassName?: string;

  /** Styling escape hatch for the active fill indicator */
  barClassName?: string;

  /** Outer wrapper container styling escape hatch */
  containerClassName?: string;

  /** Legacy alias for containerClassName */
  customClassName?: string;
}
