import {
  type ButtonHTMLAttributes,
  Children,
  cloneElement,
  type ComponentType,
  isValidElement,
  type ReactElement,
  type Ref,
} from 'react';

import { Loader2, type LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'text';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonIcon =
  | LucideIcon
  | ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  | ReactElement;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant of the button.
   * @default 'secondary'
   */
  variant?: ButtonVariant;

  /**
   * Dimensional scale (sm: 32px, md: 36px, lg: 40px).
   * @default 'md'
   */
  size?: ButtonSize;

  /**
   * Applies destructive/danger styling across all variants.
   * @default false
   */
  destructive?: boolean;

  /** Leading icon or component */
  leftIcon?: ButtonIcon;

  /** Trailing icon or component */
  rightIcon?: ButtonIcon;

  /** Force square icon-only button aspect ratio (auto-detected if no children) */
  isIconOnly?: boolean;

  /** Displays a loading spinner and disables user interaction */
  isLoading?: boolean;

  /** Expands the button to 100% of the parent container's width */
  fullWidth?: boolean;
}

/* --------------------------------------------------------------------------
   STYLE CONFIGURATIONS (100% CSS Variable Tokens)
   -------------------------------------------------------------------------- */

const VARIANT_CLASSES: Record<ButtonVariant, { standard: string; destructive: string }> = {
  primary: {
    standard:
      'bg-[var(--color-primary)] text-[var(--color-primary-fg)] enabled:hover:bg-[var(--color-primary-hover)] enabled:active:opacity-95 shadow-xs border border-transparent focus-visible:ring-[var(--color-primary)]',
    destructive:
      'bg-[var(--color-status-danger)] text-[var(--color-status-danger-fg)] enabled:hover:opacity-90 enabled:active:opacity-95 shadow-xs border border-transparent focus-visible:ring-[var(--color-status-danger)]',
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

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 py-1 text-xs gap-1.5 rounded-lg font-medium',
  md: 'h-9 px-3.5 py-1.5 text-xs gap-2 rounded-lg font-medium',
  lg: 'h-10 px-4 py-2 text-sm gap-2.5 rounded-xl font-medium',
};

const ICON_ONLY_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 p-0 rounded-lg justify-center shrink-0',
  md: 'h-9 w-9 p-0 rounded-lg justify-center shrink-0',
  lg: 'h-10 w-10 p-0 rounded-xl justify-center shrink-0',
};

const TEXT_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-xs gap-1 font-medium',
  md: 'text-xs gap-1.5 font-medium',
  lg: 'text-sm gap-2 font-medium',
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5 shrink-0',
  md: 'w-4 h-4 shrink-0',
  lg: 'w-4 h-4 shrink-0',
};

function renderIcon(icon: ButtonIcon | undefined, size: ButtonSize) {
  if (!icon) return null;

  if (isValidElement(icon)) {
    const element = icon as ReactElement<{ className?: string; 'aria-hidden'?: boolean }>;
    return cloneElement(element, {
      className: `${ICON_SIZE_CLASSES[size]} ${element.props.className ?? ''}`.trim(),
      'aria-hidden': true,
    });
  }

  const IconComponent = icon as ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  return <IconComponent className={ICON_SIZE_CLASSES[size]} aria-hidden={true} />;
}

/* --------------------------------------------------------------------------
   BUTTON COMPONENT
   -------------------------------------------------------------------------- */

export function Button({
  ref,
  type = 'button',
  variant = 'secondary',
  size = 'md',
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
}: ButtonProps & { ref?: Ref<HTMLButtonElement> }) {
  const isButtonDisabled = disabled || isLoading;
  const isText = variant === 'text';

  // React renders booleans, null, and undefined as nothing.
  // Use React.Children.toArray which automatically strips booleans, null, and undefined,
  // then filter out empty strings to detect genuine rendered content (e.g. preserves 0 and non-empty strings/elements).
  const renderedChildren = Children.toArray(children).filter(
    child => child !== '' && typeof child !== 'boolean',
  );
  const hasChildren = renderedChildren.length > 0;

  // Automatically determine if the button is icon-only (when no content children provided).
  // The text variant is an inline hyperlink action, so isIconOnly does not apply to it.
  const isIconOnly =
    !isText && (explicitIconOnly ?? (!hasChildren && Boolean(leftIcon || rightIcon)));

  let dimensionClass = SIZE_CLASSES[size];
  if (isText) {
    dimensionClass = TEXT_SIZE_CLASSES[size];
  } else if (isIconOnly) {
    dimensionClass = ICON_ONLY_CLASSES[size];
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
      aria-disabled={isButtonDisabled}
      className={`inline-flex items-center select-none transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] ${alignmentClass} ${variantStyle} ${dimensionClass} ${className}`.trim()}
    >
      {isLoading ? (
        <Loader2 className={`animate-spin ${ICON_SIZE_CLASSES[size]}`} aria-hidden="true" />
      ) : (
        renderIcon(leftIcon, size)
      )}

      {hasChildren && <span>{children}</span>}

      {!isLoading && renderIcon(rightIcon, size)}
    </button>
  );
}
