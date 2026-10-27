import { cloneElement, type ComponentType, isValidElement, type ReactElement } from 'react';

import { Loader2 } from 'lucide-react';

import type { ButtonIcon, ButtonProps, ButtonVariant } from './Button.types';

export type { ButtonIcon, ButtonProps, ButtonVariant };

/* --------------------------------------------------------------------------
   STYLE CONFIGURATIONS (100% CSS Variable Tokens — Canonical 36px / h-9)
   -------------------------------------------------------------------------- */

const VARIANT_CLASSES: Record<ButtonVariant, { standard: string; destructive: string }> = {
  primary: {
    standard:
      'bg-[var(--color-primary)] text-white enabled:hover:bg-[var(--color-primary-hover)] enabled:active:opacity-95 shadow-xs border border-transparent focus-visible:ring-[var(--color-primary)]',
    destructive:
      'bg-[var(--color-status-danger)] text-white enabled:hover:opacity-90 enabled:active:opacity-95 shadow-xs border border-transparent focus-visible:ring-[var(--color-status-danger)]',
  },
  secondary: {
    standard:
      'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] enabled:hover:bg-[var(--color-surface-hover)] enabled:hover:text-[var(--color-text-main)] enabled:active:bg-[var(--color-surface-subtle)] shadow-xs focus-visible:ring-[var(--color-primary)]',
    destructive:
      'border border-[var(--color-status-danger-border)] bg-[var(--color-surface)] text-[var(--color-status-danger)] enabled:hover:bg-[var(--color-status-danger-light)] enabled:active:opacity-90 shadow-xs focus-visible:ring-[var(--color-status-danger)]',
  },
  ghost: {
    standard:
      'border border-transparent bg-transparent text-[var(--color-text-secondary)] enabled:hover:bg-[var(--color-surface-hover)] enabled:hover:text-[var(--color-text-main)] enabled:active:bg-[var(--color-surface-subtle)] focus-visible:ring-[var(--color-primary)]',
    destructive:
      'border border-transparent bg-transparent text-[var(--color-status-danger)] enabled:hover:bg-[var(--color-status-danger-light)] enabled:active:opacity-90 focus-visible:ring-[var(--color-status-danger)]',
  },
  text: {
    standard:
      'border-0 bg-transparent text-[var(--color-primary)] enabled:hover:underline enabled:active:opacity-80 p-0 h-auto font-medium shadow-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]',
    destructive:
      'border-0 bg-transparent text-[var(--color-status-danger)] enabled:hover:underline enabled:active:opacity-80 p-0 h-auto font-medium shadow-none focus-visible:ring-1 focus-visible:ring-[var(--color-status-danger)]',
  },
};

const BUTTON_DIMENSION_CLASS = 'h-9 px-3.5 py-1.5 text-xs gap-2 rounded-lg font-medium';
const ICON_ONLY_DIMENSION_CLASS = 'h-9 w-9 p-0 rounded-lg justify-center shrink-0';
const TEXT_DIMENSION_CLASS = 'text-xs gap-1.5 font-medium';
const ICON_CLASS = 'w-4 h-4 shrink-0';

function renderIcon(icon: ButtonIcon | undefined) {
  if (!icon) return null;

  if (isValidElement(icon)) {
    const element = icon as ReactElement<{ className?: string; 'aria-hidden'?: boolean }>;
    return cloneElement(element, {
      className: `${ICON_CLASS} ${element.props.className ?? ''}`.trim(),
      'aria-hidden': true,
    });
  }

  const IconComponent = icon as ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  return <IconComponent className={ICON_CLASS} aria-hidden={true} />;
}

/* --------------------------------------------------------------------------
   BUTTON COMPONENT
   -------------------------------------------------------------------------- */

export function Button({
  ref,
  type = 'button',
  variant = 'secondary',
  destructive = false,
  leftIcon,
  rightIcon,
  isIconOnly: explicitIconOnly,
  isLoading = false,
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const isButtonDisabled = disabled || isLoading;
  const isText = variant === 'text';

  const hasChildren =
    children !== undefined &&
    children !== null &&
    children !== false &&
    children !== '' &&
    (!Array.isArray(children) || children.length > 0);

  // Automatically determine if the button is icon-only (when no content children provided).
  // The text variant is an inline hyperlink action, so isIconOnly does not apply to it.
  const isIconOnly =
    !isText && (explicitIconOnly ?? (!hasChildren && Boolean(leftIcon || rightIcon)));

  let dimensionClass = BUTTON_DIMENSION_CLASS;
  if (isText) {
    dimensionClass = TEXT_DIMENSION_CLASS;
  } else if (isIconOnly) {
    dimensionClass = ICON_ONLY_DIMENSION_CLASS;
  }

  let alignmentClass = '';
  if (fullWidth) {
    alignmentClass = 'w-full justify-center';
  } else if (isIconOnly) {
    alignmentClass = 'justify-center';
  }

  const variantStyle = VARIANT_CLASSES[variant][destructive ? 'destructive' : 'standard'];

  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={isButtonDisabled}
      aria-busy={isLoading}
      className={`inline-flex items-center whitespace-nowrap select-none transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] ${alignmentClass} ${variantStyle} ${dimensionClass} ${className}`.trim()}
    >
      {isLoading ? (
        <Loader2 className={`animate-spin ${ICON_CLASS}`} aria-hidden="true" />
      ) : (
        renderIcon(leftIcon)
      )}

      {hasChildren && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{children}</span>
      )}

      {!isLoading && renderIcon(rightIcon)}
    </button>
  );
}
