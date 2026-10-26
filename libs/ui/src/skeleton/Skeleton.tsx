import type { CSSProperties } from 'react';

import type { SkeletonProps } from './Skeleton.types';
import {
  formatDimension,
  getSkeletonAnimationClass,
  getSkeletonVariantClass,
} from './skeleton.utils';

export function Skeleton({
  ref,
  variant = 'text',
  animation = 'pulse',
  width,
  height,
  lines = 1,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const isMultiLine = variant === 'text' && lines > 1;
  const variantClass = getSkeletonVariantClass(variant);
  const animationClass = getSkeletonAnimationClass(animation);
  const baseClasses = `bg-[var(--color-surface-subtle)] ${variantClass} ${animationClass}`.trim();

  const formattedWidth = formatDimension(width);
  const formattedHeight = formatDimension(height);

  const inlineStyles: CSSProperties = {
    ...style,
    ...(formattedWidth ? { width: formattedWidth } : {}),
    ...(formattedHeight ? { height: formattedHeight } : {}),
  };

  if (isMultiLine) {
    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading..."
        className={`flex flex-col gap-2 ${className}`.trim()}
        {...props}
      >
        {Array.from({ length: lines }).map((_, index) => {
          const isLast = index === lines - 1;
          const lineStyle: CSSProperties = {
            height: formattedHeight ?? '1em',
            width: isLast ? '75%' : '100%',
          };

          return (
            <div
              key={index}
              data-testid="skeleton-line"
              className={`${baseClasses} h-4 w-full`}
              style={lineStyle}
            />
          );
        })}
      </div>
    );
  }

  const defaultHeightClass = variant === 'text' && !formattedHeight ? 'h-4' : '';
  const defaultWidthClass = variant === 'text' && !formattedWidth ? 'w-full' : '';

  return (
    <div
      ref={ref}
      role="status"
      aria-label="Loading..."
      data-testid="skeleton"
      style={inlineStyles}
      className={`${baseClasses} ${defaultHeightClass} ${defaultWidthClass} ${className}`.trim()}
      {...props}
    />
  );
}
