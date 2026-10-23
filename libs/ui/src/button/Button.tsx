import {
  type ButtonHTMLAttributes,
  type ElementType,
  isValidElement,
  type ReactNode,
  type Ref,
} from 'react';

import { Loader2, type LucideIcon } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'ghost'
  | 'danger'
  | 'danger-solid'
  | 'link'
  | 'link-danger'
  | 'link-warning'
  | 'link-muted';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon' | 'icon-lg';

export type ButtonIcon = LucideIcon | ElementType | ReactNode;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ButtonIcon;
  rightIcon?: ButtonIcon;
  badge?: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:opacity-95 shadow-sm border border-transparent',
  secondary:
    'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] active:bg-[var(--color-surface-subtle)] shadow-sm',
  subtle:
    'border border-[var(--color-primary-border)] bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:opacity-95 shadow-sm font-semibold',
  ghost:
    'border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)] active:bg-[var(--color-surface-subtle)]',
  danger:
    'border border-[var(--color-status-danger-border)] bg-[var(--color-surface)] text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger-light)] active:opacity-90 shadow-sm',
  'danger-solid':
    'bg-[var(--color-status-danger)] text-white hover:opacity-90 active:opacity-95 shadow-sm border border-transparent',
  link: 'border-0 bg-transparent text-[var(--color-primary)] hover:underline active:opacity-80 p-0 h-auto font-medium shadow-none focus-visible:ring-1',
  'link-danger':
    'border-0 bg-transparent text-rose-600 dark:text-rose-400 hover:underline active:opacity-80 p-0 h-auto font-medium shadow-none focus-visible:ring-1',
  'link-warning':
    'border-0 bg-transparent text-amber-600 dark:text-amber-400 hover:underline active:opacity-80 p-0 h-auto font-medium shadow-none focus-visible:ring-1',
  'link-muted':
    'border-0 bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:underline active:opacity-80 p-0 h-auto font-medium shadow-none focus-visible:ring-1',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 py-1 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 py-2 text-xs gap-2 rounded-lg font-medium',
  lg: 'h-10 px-4 py-2.5 text-sm gap-2.5 rounded-xl font-medium',
  'icon-sm': 'h-7 w-7 p-1 rounded-md text-xs justify-center shrink-0',
  icon: 'h-8 w-8 p-1.5 rounded-lg text-xs justify-center shrink-0',
  'icon-lg': 'h-9 w-9 p-2 rounded-lg text-sm justify-center shrink-0',
};

const LINK_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-[11px] gap-1',
  md: 'text-xs gap-1.5',
  lg: 'text-sm gap-2',
  'icon-sm': 'text-[11px] gap-1',
  icon: 'text-xs gap-1.5',
  'icon-lg': 'text-sm gap-2',
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5 shrink-0',
  md: 'w-3.5 h-3.5 shrink-0',
  lg: 'w-4 h-4 shrink-0',
  'icon-sm': 'w-3.5 h-3.5 shrink-0',
  icon: 'w-3.5 h-3.5 shrink-0',
  'icon-lg': 'w-4 h-4 shrink-0',
};

function renderIcon(icon: ButtonIcon | undefined, size: ButtonSize) {
  if (!icon) return null;

  if (isValidElement(icon)) {
    return icon;
  }

  const IconComponent = icon as ElementType;
  return <IconComponent className={ICON_SIZE_CLASSES[size]} aria-hidden="true" />;
}

export function Button({
  ref,
  type = 'button',
  variant = 'secondary',
  size = 'md',
  leftIcon,
  rightIcon,
  badge,
  isLoading = false,
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ButtonProps & { ref?: Ref<HTMLButtonElement> }) {
  const isButtonDisabled = disabled || isLoading;
  const isLink = variant.startsWith('link');
  const sizeClass = isLink ? LINK_SIZE_CLASSES[size] : SIZE_CLASSES[size];

  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={isButtonDisabled}
      aria-busy={isLoading}
      aria-disabled={isButtonDisabled}
      className={`inline-flex items-center select-none transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${
        fullWidth ? 'w-full justify-center' : 'justify-center'
      } ${VARIANT_CLASSES[variant]} ${sizeClass} ${className}`}
    >
      {isLoading ? (
        <Loader2 className={`animate-spin ${ICON_SIZE_CLASSES[size]}`} aria-hidden="true" />
      ) : (
        renderIcon(leftIcon, size)
      )}

      {children && <span>{children}</span>}

      {badge && (
        <span
          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold leading-tight ${
            variant === 'primary' || variant === 'danger-solid'
              ? 'bg-white/20 text-white'
              : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
          }`}
        >
          {badge}
        </span>
      )}

      {!isLoading && renderIcon(rightIcon, size)}
    </button>
  );
}
