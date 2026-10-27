import type { Ref } from 'react';

export type LoaderSize = 'sm' | 'md' | 'lg';
export type LoaderVariant = 'spinner' | 'dots' | 'pulse';

export interface LoaderProps {
  /**
   * Accessible description announced by screen readers.
   * @default 'Loading...'
   */
  label?: string;

  /**
   * Renders visual text label below the indicator.
   * @default false
   */
  showLabel?: boolean;

  /**
   * Dimensional scale.
   * @default 'md'
   */
  size?: LoaderSize;

  /**
   * Visual indicator style.
   * @default 'spinner'
   */
  variant?: LoaderVariant;

  /**
   * Root container styling escape hatch.
   */
  customClassName?: string;

  /**
   * React 19 native ref forwarded directly to the root element.
   */
  ref?: Ref<HTMLDivElement>;
}
