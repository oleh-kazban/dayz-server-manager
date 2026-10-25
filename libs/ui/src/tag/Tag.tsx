import { type ElementType, isValidElement, type MouseEvent, type ReactNode, type Ref } from 'react';

import { type LucideIcon, X } from 'lucide-react';

export type TagVariant = 'subtle' | 'solid' | 'outline' | 'neutral';

export type TagColor =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'gray';

export type TagShape = 'rounded' | 'pill';

export type TagIcon = LucideIcon | ElementType | ReactNode;

export interface TagProps {
  /**
   * React 19 ref forwarded directly to the native <span> badge element.
   */
  ref?: Ref<HTMLSpanElement>;

  /**
   * Visual stylistic variant of the tag badge.
   * @default 'subtle'
   */
  variant?: TagVariant;

  /**
   * Color variant mapping to DSM semantic tokens or tactical taxonomy.
   * @default 'default'
   */
  color?: TagColor;

  /**
   * Border radius shape (rounded: 6px, pill: full rounded).
   * @default 'rounded'
   */
  shape?: TagShape;

  /** Leading icon or Lucide component */
  leftIcon?: TagIcon;

  /** Trailing icon or Lucide component */
  rightIcon?: TagIcon;

  /** Callback fired when dismiss button is clicked */
  onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;

  /** Accessible label for the remove button */
  removeAriaLabel?: string;

  /** Transforms text to uppercase with tracking-wider */
  uppercase?: boolean;

  /** Renders content with monospace font */
  mono?: boolean;

  /** Disables interactions and reduces opacity */
  disabled?: boolean;

  /** Single external class escape hatch */
  customClassName?: string;

  children?: ReactNode;
  className?: string;
  id?: string;
  title?: string;
  'aria-label'?: string;
}

/* --------------------------------------------------------------------------
   STYLE CONFIGURATIONS (DSM Token Mappings)
   -------------------------------------------------------------------------- */

const SHAPE_CLASSES: Record<TagShape, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-full',
};

const REMOVE_BUTTON_SHAPE_CLASSES: Record<TagShape, string> = {
  rounded: 'rounded-sm',
  pill: 'rounded-full',
};

type SemanticTagColor = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const SEMANTIC_COLOR_MAP: Record<TagColor, SemanticTagColor> = {
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

/* Color mapping for SUBTLE variant (Tinted background, matching subtle border, colored text) */
const SUBTLE_COLOR_CLASSES: Record<SemanticTagColor, string> = {
  default:
    'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]',
  primary:
    'border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  success:
    'border-[var(--color-status-success-border)] bg-[var(--color-status-success-light)] text-[var(--color-status-success)]',
  warning:
    'border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-light)] text-[var(--color-status-warning)]',
  danger:
    'border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-light)] text-[var(--color-status-danger)]',
  info: 'border-[var(--color-status-info-border)] bg-[var(--color-status-info-light)] text-[var(--color-status-info)]',
};

/* Color mapping for SOLID variant (Solid background, contrasting text) */
const SOLID_COLOR_CLASSES: Record<SemanticTagColor, string> = {
  default:
    'bg-[var(--color-surface-hover)] text-[var(--color-text-main)] border-[var(--color-border)] shadow-xs',
  primary: 'bg-[var(--color-primary)] text-white border-transparent shadow-xs',
  success: 'bg-[var(--color-status-success)] text-white border-transparent shadow-xs',
  warning:
    'bg-[var(--color-status-warning)] text-[var(--color-status-warning-fg)] border-transparent shadow-xs',
  danger:
    'bg-[var(--color-status-danger)] text-[var(--color-status-danger-fg)] border-transparent shadow-xs',
  info: 'bg-[var(--color-status-info)] text-white border-transparent shadow-xs',
};

/* Color mapping for OUTLINE variant (Transparent background, colored border and text) */
const OUTLINE_COLOR_CLASSES: Record<SemanticTagColor, string> = {
  default: 'border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)]',
  primary: 'border-[var(--color-primary)] bg-transparent text-[var(--color-primary)]',
  success: 'border-[var(--color-status-success)] bg-transparent text-[var(--color-status-success)]',
  warning: 'border-[var(--color-status-warning)] bg-transparent text-[var(--color-status-warning)]',
  danger: 'border-[var(--color-status-danger)] bg-transparent text-[var(--color-status-danger)]',
  info: 'border-[var(--color-status-info)] bg-transparent text-[var(--color-status-info)]',
};

function renderTagIcon(icon: TagIcon | undefined) {
  if (!icon) return null;

  if (isValidElement(icon)) {
    return icon;
  }

  const IconComponent = icon as ElementType;
  return <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
}

function getTagColorClass(variant: TagVariant, color: TagColor): string {
  const semanticColor = SEMANTIC_COLOR_MAP[color];
  if (variant === 'solid') {
    return SOLID_COLOR_CLASSES[semanticColor];
  }
  if (variant === 'outline') {
    return OUTLINE_COLOR_CLASSES[semanticColor];
  }
  if (variant === 'neutral') {
    return 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]';
  }
  return SUBTLE_COLOR_CLASSES[semanticColor];
}

/* --------------------------------------------------------------------------
   TAG COMPONENT
   -------------------------------------------------------------------------- */

export function Tag({
  ref,
  id,
  title,
  'aria-label': ariaLabel,
  variant = 'subtle',
  color = 'default',
  shape = 'rounded',
  leftIcon,
  rightIcon,
  onRemove,
  removeAriaLabel,
  uppercase = false,
  mono = false,
  disabled = false,
  className = '',
  customClassName = '',
  children,
}: TagProps) {
  const colorClass = getTagColorClass(variant, color);

  const handleRemove = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!disabled && onRemove) {
      onRemove(e);
    }
  };

  const mergedClass = customClassName || className;

  return (
    <span
      ref={ref}
      id={id}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex items-center w-fit border font-semibold select-none transition-colors h-6 text-xs px-2.5 gap-1.5 leading-none ${
        SHAPE_CLASSES[shape]
      } ${colorClass} ${uppercase ? 'uppercase tracking-wider' : ''} ${
        mono ? 'font-mono' : ''
      } ${disabled ? 'opacity-50' : ''} ${mergedClass}`.trim()}
    >
      {/* Left Icon */}
      {renderTagIcon(leftIcon)}

      {/* Content */}
      {children && <span className="truncate">{children}</span>}

      {/* Right Icon */}
      {renderTagIcon(rightIcon)}

      {/* Dismiss / Remove Button */}
      {onRemove && (
        <button
          type="button"
          disabled={disabled}
          onClick={handleRemove}
          aria-label={removeAriaLabel || 'Remove tag'}
          className={`${REMOVE_BUTTON_SHAPE_CLASSES[shape]} ${
            shape === 'pill' ? '-mr-1' : '-mr-[7px]'
          } p-0.5 text-inherit transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current ${
            disabled
              ? 'cursor-not-allowed opacity-40'
              : 'opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer'
          }`}
        >
          <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
