import type { EmptyStateVariant } from './EmptyState.types';

export function getEmptyStateVariantClasses(variant: EmptyStateVariant = 'default'): string {
  switch (variant) {
    case 'dashed':
      return 'rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-8 sm:p-12';
    case 'compact':
      return 'py-5 px-3 space-y-1';
    case 'default':
    default:
      return 'py-10 sm:py-14 px-4';
  }
}

export function getEmptyStateTitleClasses(variant: EmptyStateVariant = 'default'): string {
  if (variant === 'compact') {
    return 'text-xs font-semibold text-[var(--color-text-main)]';
  }
  return 'text-sm sm:text-base font-semibold text-[var(--color-text-main)] tracking-tight';
}
