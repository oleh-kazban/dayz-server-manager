import type { ElementType, HTMLAttributes, ReactNode, Ref } from 'react';

import type { LucideIcon } from 'lucide-react';

export type StatusTagDomainStatus = 'online' | 'offline' | 'restarting' | 'stopped';

export type StatusTagSemanticStatus =
  'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

export type StatusTagStatus = StatusTagSemanticStatus | StatusTagDomainStatus;

export type StatusTagVariant = 'subtle' | 'solid' | 'outline';

export type StatusTagShape = 'rounded' | 'pill';

export type StatusTagIcon = LucideIcon | ElementType | ReactNode;

export interface StatusTagProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * React 19 ref forwarded directly to the native <span> element.
   */
  ref?: Ref<HTMLSpanElement>;

  /**
   * Semantic system state or DayZ domain status driving token styling and indicator dot.
   * Supports visual statuses ('success', 'warning', 'danger', 'info', 'neutral', 'primary')
   * or domain lifecycle statuses ('online', 'offline', 'restarting', 'stopped').
   */
  status: StatusTagStatus;

  /**
   * Visual treatment (subtle: tinted; solid: high-contrast; outline: crisp border).
   * @default 'subtle'
   */
  variant?: StatusTagVariant;

  /**
   * Border radius shape (rounded: 6px, pill: full rounded).
   * @default 'rounded'
   */
  shape?: StatusTagShape;

  /**
   * Enables radar pulsating ring animation around the status dot.
   * Defaults to true for 'restarting', false otherwise.
   */
  ping?: boolean;

  /**
   * Optional trailing companion icon.
   */
  rightIcon?: StatusTagIcon;

  /**
   * Transforms text to uppercase with tracking-wider.
   * @default false
   */
  uppercase?: boolean;

  /**
   * Renders content with monospace font for status codes or metrics.
   * @default false
   */
  mono?: boolean;

  /**
   * Single external class escape hatch.
   */
  customClassName?: string;
}
