import { Loader2 } from 'lucide-react';

export interface LoaderProps {
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots';
  className?: string;
}

const SIZE_MAP = {
  sm: { icon: 'h-4 w-4', dot: 'h-1.5 w-1.5', text: 'text-xs' },
  md: { icon: 'h-6 w-6', dot: 'h-2.5 w-2.5', text: 'text-xs' },
  lg: { icon: 'h-8 w-8', dot: 'h-3.5 w-3.5', text: 'text-sm' },
};

export function Loader({
  label = 'Loading...',
  showLabel = false,
  size = 'md',
  variant = 'spinner',
  className = '',
}: LoaderProps) {
  const sizeConfig = SIZE_MAP[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2.5 text-[var(--color-primary)] ${className}`}
    >
      <span className="sr-only">{label}</span>

      {variant === 'spinner' ? (
        <Loader2 className={`animate-spin ${sizeConfig.icon}`} />
      ) : (
        <div className="flex items-center space-x-1.5" aria-hidden="true">
          <div
            className={`animate-bounce rounded-full bg-current ${sizeConfig.dot}`}
            style={{ animationDelay: '-0.3s' }}
          />
          <div
            className={`animate-bounce rounded-full bg-current ${sizeConfig.dot}`}
            style={{ animationDelay: '-0.15s' }}
          />
          <div className={`animate-bounce rounded-full bg-current ${sizeConfig.dot}`} />
        </div>
      )}

      {showLabel && (
        <span className={`font-medium text-[var(--color-text-muted)] ${sizeConfig.text}`}>
          {label}
        </span>
      )}
    </div>
  );
}
