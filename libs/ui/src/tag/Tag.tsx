import {
  type ButtonHTMLAttributes,
  type ElementType,
  type HTMLAttributes,
  isValidElement,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { type LucideIcon, Plus, X } from 'lucide-react';

export type TagVariant = 'subtle' | 'solid' | 'outline' | 'neutral';

export type TagColor =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'rose'
  | 'purple'
  | 'amber'
  | 'emerald'
  | 'teal'
  | 'sky'
  | 'blue'
  | 'cyan'
  | 'gray';

export type TagSize = 'sm' | 'md' | 'lg';

export type TagShape = 'rounded' | 'pill';

export type TagIcon = LucideIcon | ElementType | ReactNode;

export type TagDotConfig = {
  color?: string;
  ping?: boolean;
};

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  color?: TagColor;
  size?: TagSize;
  shape?: TagShape;
  leftIcon?: TagIcon;
  rightIcon?: TagIcon;
  dot?: boolean | TagDotConfig;
  onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;
  removeAriaLabel?: string;
  uppercase?: boolean;
  mono?: boolean;
  disabled?: boolean;
}

export interface TagAddButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: TagSize;
  shape?: TagShape;
}

/* --------------------------------------------------------------------------
   STYLE CONFIGURATIONS
   -------------------------------------------------------------------------- */

const SIZE_CLASSES: Record<TagSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-[11px] px-2 py-0.5 gap-1.5',
  lg: 'text-xs px-2.5 py-1 gap-1.5',
};

const ICON_SIZE_CLASSES: Record<TagSize, string> = {
  sm: 'w-3 h-3 shrink-0',
  md: 'w-3 h-3 shrink-0',
  lg: 'w-3.5 h-3.5 shrink-0',
};

const SHAPE_CLASSES: Record<TagShape, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-full',
};

/* Color mapping for SUBTLE variant (Tinted background, matching subtle border, colored text) */
const SUBTLE_COLOR_CLASSES: Record<TagColor, string> = {
  default:
    'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]',
  primary:
    'border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  amber: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  rose: 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  sky: 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  purple: 'border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400',
  teal: 'border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400',
  cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  blue: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  gray: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
};

/* Color mapping for SOLID variant (Solid background, white text, optional shadow) */
const SOLID_COLOR_CLASSES: Record<TagColor, string> = {
  default: 'bg-zinc-700 text-white shadow-sm border-transparent',
  primary: 'bg-[var(--color-primary)] text-white shadow-sm border-transparent',
  success: 'bg-emerald-600 text-white shadow-sm border-transparent',
  emerald: 'bg-emerald-600 text-white shadow-sm border-transparent',
  warning: 'bg-amber-600 text-white shadow-sm border-transparent',
  amber: 'bg-amber-600 text-white shadow-sm border-transparent',
  danger: 'bg-rose-600 text-white shadow-sm border-transparent',
  rose: 'bg-rose-600 text-white shadow-sm border-transparent',
  info: 'bg-sky-600 text-white shadow-sm border-transparent',
  sky: 'bg-sky-600 text-white shadow-sm border-transparent',
  purple: 'bg-purple-600 text-white shadow-sm border-transparent',
  teal: 'bg-teal-600 text-white shadow-sm border-transparent',
  cyan: 'bg-cyan-600 text-white shadow-sm border-transparent',
  blue: 'bg-blue-600 text-white shadow-sm border-transparent',
  gray: 'bg-zinc-600 text-white shadow-sm border-transparent',
};

/* Color mapping for OUTLINE variant (Transparent background, colored border, colored text) */
const OUTLINE_COLOR_CLASSES: Record<TagColor, string> = {
  default: 'border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)]',
  primary: 'border-[var(--color-primary)] bg-transparent text-[var(--color-primary)]',
  success: 'border-emerald-500 bg-transparent text-emerald-600 dark:text-emerald-400',
  emerald: 'border-emerald-500 bg-transparent text-emerald-600 dark:text-emerald-400',
  warning: 'border-amber-500 bg-transparent text-amber-600 dark:text-amber-400',
  amber: 'border-amber-500 bg-transparent text-amber-600 dark:text-amber-400',
  danger: 'border-rose-500 bg-transparent text-rose-600 dark:text-rose-400',
  rose: 'border-rose-500 bg-transparent text-rose-600 dark:text-rose-400',
  info: 'border-sky-500 bg-transparent text-sky-600 dark:text-sky-400',
  sky: 'border-sky-500 bg-transparent text-sky-600 dark:text-sky-400',
  purple: 'border-purple-500 bg-transparent text-purple-600 dark:text-purple-400',
  teal: 'border-teal-500 bg-transparent text-teal-600 dark:text-teal-400',
  cyan: 'border-cyan-500 bg-transparent text-cyan-600 dark:text-cyan-400',
  blue: 'border-blue-500 bg-transparent text-blue-600 dark:text-blue-400',
  gray: 'border-zinc-400 bg-transparent text-zinc-600 dark:text-zinc-400',
};

function renderTagIcon(icon: TagIcon | undefined, size: TagSize) {
  if (!icon) return null;

  if (isValidElement(icon)) {
    return icon;
  }

  const IconComponent = icon as ElementType;
  return <IconComponent className={ICON_SIZE_CLASSES[size]} aria-hidden="true" />;
}

/* --------------------------------------------------------------------------
   TAG COMPONENT
   -------------------------------------------------------------------------- */

export function Tag({
  ref,
  variant = 'subtle',
  color = 'default',
  size = 'md',
  shape = 'rounded',
  leftIcon,
  rightIcon,
  dot,
  onRemove,
  removeAriaLabel,
  uppercase = false,
  mono = false,
  disabled = false,
  className = '',
  children,
  ...props
}: TagProps & { ref?: Ref<HTMLSpanElement> }) {
  let colorClass = SUBTLE_COLOR_CLASSES[color];
  if (variant === 'solid') {
    colorClass = SOLID_COLOR_CLASSES[color];
  } else if (variant === 'outline') {
    colorClass = OUTLINE_COLOR_CLASSES[color];
  } else if (variant === 'neutral') {
    colorClass =
      'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]';
  }

  const isDotObject = typeof dot === 'object' && dot !== null;
  const showDot = Boolean(dot);
  const isPing = isDotObject && Boolean(dot.ping);

  const handleRemove = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!disabled && onRemove) {
      onRemove(e);
    }
  };

  const handleClick = (e: MouseEvent<HTMLSpanElement>) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    props.onClick?.(e);
  };

  let interactionClass = '';
  if (disabled) {
    interactionClass = 'opacity-50 cursor-not-allowed';
  } else if (props.onClick) {
    interactionClass = 'cursor-pointer hover:opacity-90';
  }

  return (
    <span
      {...props}
      ref={ref}
      aria-disabled={disabled}
      onClick={props.onClick ? handleClick : undefined}
      className={`inline-flex items-center border font-semibold select-none transition-colors ${
        SHAPE_CLASSES[shape]
      } ${SIZE_CLASSES[size]} ${colorClass} ${uppercase ? 'uppercase tracking-wider' : ''} ${
        mono ? 'font-mono' : ''
      } ${interactionClass} ${className}`}
    >
      {/* Optional Dot Indicator */}
      {showDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
          {isPing && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                variant === 'solid' ? 'bg-white' : 'bg-current'
              }`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              variant === 'solid' ? 'bg-white' : 'bg-current'
            }`}
          />
        </span>
      )}

      {/* Left Icon */}
      {renderTagIcon(leftIcon, size)}

      {/* Content */}
      {children && <span className="truncate">{children}</span>}

      {/* Right Icon */}
      {renderTagIcon(rightIcon, size)}

      {/* Dismiss / Remove Button */}
      {onRemove && (
        <button
          type="button"
          disabled={disabled}
          onClick={handleRemove}
          aria-label={removeAriaLabel || 'Remove tag'}
          className={`rounded-sm p-0.5 text-inherit transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current ml-0.5 ${
            disabled
              ? 'cursor-not-allowed opacity-40'
              : 'opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer'
          }`}
        >
          <X className={ICON_SIZE_CLASSES[size]} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

/* --------------------------------------------------------------------------
   TAG.ADD COMPONENT (Companion button for tag input rows)
   -------------------------------------------------------------------------- */

export function TagAddButton({
  size = 'md',
  shape = 'rounded',
  className = '',
  children = 'Add tag',
  disabled = false,
  ...props
}: TagAddButtonProps) {
  return (
    <button
      {...props}
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      className={`inline-flex items-center border border-dashed border-[var(--color-border)] text-[var(--color-primary)] transition-colors select-none font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
        disabled
          ? 'cursor-not-allowed opacity-50 shadow-none'
          : 'cursor-pointer hover:bg-[var(--color-primary-light)]'
      } ${SHAPE_CLASSES[shape]} ${SIZE_CLASSES[size]} ${className}`}
    >
      <Plus className={ICON_SIZE_CLASSES[size]} aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

Tag.Add = TagAddButton;
