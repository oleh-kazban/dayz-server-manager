import type { SemanticTagColor, TagColor } from './Tag.types';

export const SEMANTIC_COLOR_MAP: Record<TagColor, SemanticTagColor> = {
  default: 'default',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  sky: 'info',
  emerald: 'success',
  amber: 'warning',
  rose: 'danger',
  purple: 'primary',
  teal: 'success',
  cyan: 'info',
  blue: 'primary',
  gray: 'default',
};

export function getTagDotColor(color?: TagColor): string {
  if (!color) return 'var(--color-text-muted)';
  const semantic = SEMANTIC_COLOR_MAP[color] ?? 'default';
  switch (semantic) {
    case 'primary':
      return 'var(--color-primary)';
    case 'success':
      return 'var(--color-status-success)';
    case 'warning':
      return 'var(--color-status-warning)';
    case 'danger':
      return 'var(--color-status-danger)';
    case 'info':
      return 'var(--color-status-info)';
    case 'default':
    default:
      return 'var(--color-text-muted)';
  }
}
