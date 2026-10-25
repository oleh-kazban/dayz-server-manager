import type { ReactNode, Ref } from 'react';

export type CardHeadingLevel = 'h2' | 'h3' | 'h4' | 'h5';

export interface CardProps {
  /**
   * React 19 ref forwarded directly to the root element.
   */
  ref?: Ref<HTMLDivElement>;

  /**
   * Optional semantic container tag.
   * @default 'div'
   */
  as?: 'div' | 'section' | 'article';

  /**
   * Card title string or custom node.
   */
  title?: ReactNode;

  /**
   * Optional card subtitle string or node.
   */
  subtitle?: ReactNode;

  /**
   * Semantic heading level for the title element.
   * @default 'h3'
   */
  titleLevel?: CardHeadingLevel;

  /**
   * Header action bar slot.
   */
  actions?: ReactNode;

  /**
   * Projected card body content.
   */
  children?: ReactNode;

  /**
   * Bottom bordered footer slot.
   */
  footer?: ReactNode;

  /**
   * Standard container ID.
   */
  id?: string;

  /**
   * Root container class overrides.
   */
  className?: string;
}

export function Card({
  ref,
  as: Component = 'div',
  title,
  subtitle,
  titleLevel: TitleTag = 'h3',
  actions,
  footer,
  id,
  className = '',
  children,
}: CardProps) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <Component
      ref={ref}
      id={id}
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all duration-200 ${className}`}
    >
      {/* Header */}
      {hasHeader && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <TitleTag className="text-base font-semibold tracking-tight text-[var(--color-text-main)]">
                {title}
              </TitleTag>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {/* Projected Content */}
      {children && <div className={hasHeader ? 'mt-4' : ''}>{children}</div>}

      {/* Footer */}
      {footer && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
          {footer}
        </div>
      )}
    </Component>
  );
}
