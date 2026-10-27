import type { HTMLAttributes, Ref } from 'react';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';
export type SkeletonAnimation = 'pulse' | 'wave' | 'none';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Shape variant of the skeleton placeholder:
   * - `text`: Simulates single or multi-line copy (rounded-sm, 1em default height).
   * - `circular`: Simulates circular badges, avatars, or icon boxes (rounded-full).
   * - `rectangular`: Flat box with sharp edges (rounded-none).
   * - `rounded`: Matches standard card/banner radius (rounded-xl, 12px).
   * @default 'text'
   */
  variant?: SkeletonVariant;

  /**
   * Animation style:
   * - `pulse`: Standard subtle opacity pulse.
   * - `wave`: Smooth light gradient shimmer wave across the surface.
   * - `none`: Static muted surface.
   * @default 'pulse'
   */
  animation?: SkeletonAnimation;

  /**
   * Explicit width override (e.g. 120, '100%', '6rem').
   */
  width?: string | number;

  /**
   * Explicit height override (e.g. 24, '1.5rem').
   */
  height?: string | number;

  /**
   * Number of lines to generate when `variant="text"`.
   * When > 1, generates multiple lines with a naturally shortened final line.
   * @default 1
   */
  lines?: number;

  /**
   * Forwarded React 19 ref for the root container.
   */
  ref?: Ref<HTMLDivElement>;
}
