import type { ReactElement, ReactNode, Ref } from 'react';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /**
   * Tooltip content to display. If empty or nullish, tooltip will not show.
   */
  content: ReactNode;

  /**
   * Placement relative to the trigger element.
   * @default 'top'
   */
  placement?: TooltipPlacement;

  /**
   * Hover intent delay in milliseconds before showing the tooltip.
   * Keyboard focus reveals the tooltip immediately without delay.
   * @default 250
   */
  delay?: number;

  /**
   * Disables the tooltip from appearing.
   * @default false
   */
  disabled?: boolean;

  /**
   * Trigger element that activates the tooltip on hover and focus.
   * Must be a valid single React element.
   */
  children: ReactElement;

  /**
   * Optional custom classes for the floating tooltip popup.
   */
  className?: string;

  /**
   * Ref forwarded to the floating tooltip element when rendered.
   */
  ref?: Ref<HTMLDivElement>;
}
