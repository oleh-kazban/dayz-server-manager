import { type CSSProperties, type Ref } from 'react';

import { Loader2 } from 'lucide-react';

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

const SIZE_MAP: Record<
  LoaderSize,
  {
    icon: string;
    dot: string;
    gap: string;
    bounceHeight: string;
    text: string;
  }
> = {
  sm: {
    icon: 'h-4 w-4',
    dot: 'h-1.5 w-1.5',
    gap: 'gap-1.5',
    bounceHeight: '-5px',
    text: 'text-xs',
  },
  md: {
    icon: 'h-6 w-6',
    dot: 'h-2 w-2',
    gap: 'gap-2',
    bounceHeight: '-8px',
    text: 'text-xs',
  },
  lg: {
    icon: 'h-8 w-8',
    dot: 'h-2.5 w-2.5',
    gap: 'gap-2.5',
    bounceHeight: '-12px',
    text: 'text-sm',
  },
};

export function Loader({
  ref,
  label = 'Loading...',
  showLabel = false,
  size = 'md',
  variant = 'spinner',
  customClassName = '',
}: LoaderProps) {
  const sizeConfig = SIZE_MAP[size];

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2.5 text-[var(--color-primary)] ${customClassName}`.trim()}
    >
      <span className="sr-only">{label}</span>

      {variant === 'spinner' && <Loader2 className={`animate-spin ${sizeConfig.icon}`} />}

      {variant === 'dots' && (
        <div
          className={`flex items-center ${sizeConfig.gap} pt-2`}
          style={{ '--loader-bounce-height': sizeConfig.bounceHeight } as CSSProperties}
          aria-hidden="true"
        >
          <div
            className={`animate-loader-bounce rounded-full bg-current ${sizeConfig.dot}`}
            style={{ animationDelay: '-0.3s' }}
          />
          <div
            className={`animate-loader-bounce rounded-full bg-current ${sizeConfig.dot}`}
            style={{ animationDelay: '-0.15s' }}
          />
          <div className={`animate-loader-bounce rounded-full bg-current ${sizeConfig.dot}`} />
        </div>
      )}

      {variant === 'pulse' && (
        <div className={`flex items-center ${sizeConfig.gap}`} aria-hidden="true">
          <div
            className={`animate-loader-pulse rounded-full bg-current ${sizeConfig.dot}`}
            style={{ animationDelay: '-0.32s' }}
          />
          <div
            className={`animate-loader-pulse rounded-full bg-current ${sizeConfig.dot}`}
            style={{ animationDelay: '-0.16s' }}
          />
          <div className={`animate-loader-pulse rounded-full bg-current ${sizeConfig.dot}`} />
        </div>
      )}

      {showLabel && (
        <span className={`font-medium font-sans text-[var(--color-text-muted)] ${sizeConfig.text}`}>
          {label}
        </span>
      )}
    </div>
  );
}
