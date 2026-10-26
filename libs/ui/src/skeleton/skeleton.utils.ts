import type { SkeletonAnimation, SkeletonVariant } from './Skeleton.types';

export function formatDimension(val?: string | number): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'number') return `${val}px`;
  return val;
}

export function getSkeletonVariantClass(variant: SkeletonVariant = 'text'): string {
  switch (variant) {
    case 'circular':
      return 'rounded-full shrink-0';
    case 'rectangular':
      return 'rounded-none';
    case 'rounded':
      return 'rounded-xl';
    case 'text':
    default:
      return 'rounded-sm';
  }
}

export function getSkeletonAnimationClass(animation: SkeletonAnimation = 'pulse'): string {
  switch (animation) {
    case 'wave':
      return 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent motion-reduce:before:hidden';
    case 'none':
      return '';
    case 'pulse':
    default:
      return 'animate-pulse motion-reduce:animate-none';
  }
}
