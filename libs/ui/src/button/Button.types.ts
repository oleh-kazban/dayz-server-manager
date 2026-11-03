import { type ButtonHTMLAttributes, type ComponentType, type ReactElement, type Ref } from 'react';

import { type LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'text';

export type ButtonIcon =
  | LucideIcon
  | ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  | ReactElement;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * React 19 ref forwarded directly to the native <button> element.
   */
  ref?: Ref<HTMLButtonElement>;

  /**
   * Visual style variant of the button.
   * @default 'secondary'
   */
  variant?: ButtonVariant;

  /**
   * Applies destructive/danger styling across all variants.
   * @default false
   */
  destructive?: boolean;

  /** Leading icon or component */
  leftIcon?: ButtonIcon;

  /** Trailing icon or component */
  rightIcon?: ButtonIcon;

  /** Force square icon-only button aspect ratio (auto-detected if no children) */
  isIconOnly?: boolean;

  /** Displays a loading spinner and disables user interaction */
  isLoading?: boolean;

  /** Expands the button to 100% of the parent container's width */
  fullWidth?: boolean;
}
