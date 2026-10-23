import { type ElementType, type HTMLAttributes, type ReactNode, type Ref } from 'react';

export type CardVariant = 'default' | 'subtle' | 'ghost' | 'flat';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  as?: ElementType;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  as?: ElementType;
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span';
}

export interface CardSubtitleProps extends HTMLAttributes<HTMLParagraphElement> {
  as?: 'p' | 'span' | 'div';
}

export type CardActionsProps = HTMLAttributes<HTMLDivElement>;

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

/* --------------------------------------------------------------------------
   STYLE CONFIGURATIONS
   -------------------------------------------------------------------------- */

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:
    'border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm hover:shadow-md transition-shadow duration-200',
  subtle: 'border border-[var(--color-border)] bg-[var(--color-surface-subtle)]',
  flat: 'border border-[var(--color-border)] bg-[var(--color-surface)]',
  ghost: 'border border-transparent bg-transparent shadow-none',
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4 space-y-3',
  md: 'p-5 space-y-4',
  lg: 'p-6 space-y-5',
};

/* --------------------------------------------------------------------------
   SUB-COMPONENTS
   -------------------------------------------------------------------------- */

export function CardTitle({
  as: Component = 'h3',
  className = '',
  children,
  ...props
}: CardTitleProps) {
  return (
    <Component
      {...props}
      className={`text-base font-semibold tracking-tight text-[var(--color-text-main)] ${className}`}
    >
      {children}
    </Component>
  );
}

export function CardSubtitle({
  as: Component = 'p',
  className = '',
  children,
  ...props
}: CardSubtitleProps) {
  return (
    <Component
      {...props}
      className={`text-xs text-[var(--color-text-muted)] leading-relaxed ${className}`}
    >
      {children}
    </Component>
  );
}

export function CardActions({ className = '', children, ...props }: CardActionsProps) {
  return (
    <div {...props} className={`flex items-center gap-2.5 shrink-0 flex-wrap ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  as: Component = 'div',
  className = '',
  children,
  ...props
}: CardHeaderProps) {
  return (
    <Component {...props} className={`flex items-start justify-between gap-4 ${className}`}>
      {children}
    </Component>
  );
}

export function CardBody({ className = '', children, ...props }: CardBodyProps) {
  return (
    <div {...props} className={`w-full ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }: CardFooterProps) {
  return (
    <div
      {...props}
      className={`border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)] flex items-center justify-between gap-3 flex-wrap ${className}`}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
   ROOT CARD COMPONENT
   -------------------------------------------------------------------------- */

export function Card({
  ref,
  as: Component = 'div',
  title,
  subtitle,
  actions,
  footer,
  variant = 'default',
  padding = 'md',
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  children,
  ...props
}: CardProps & { ref?: Ref<HTMLDivElement> }) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <Component
      {...props}
      ref={ref}
      className={`rounded-2xl ${VARIANT_CLASSES[variant]} ${PADDING_CLASSES[padding]} ${className}`}
    >
      {/* Header (when title, subtitle, or actions are provided as props) */}
      {hasHeader && (
        <CardHeader className={headerClassName}>
          <div className="space-y-0.5">
            {title && (typeof title === 'string' ? <CardTitle>{title}</CardTitle> : title)}
            {subtitle &&
              (typeof subtitle === 'string' ? <CardSubtitle>{subtitle}</CardSubtitle> : subtitle)}
          </div>
          {actions && <CardActions>{actions}</CardActions>}
        </CardHeader>
      )}

      {/* Main Card Content */}
      {children && <CardBody className={bodyClassName}>{children}</CardBody>}

      {/* Footer (when footer prop is provided) */}
      {footer && <CardFooter className={footerClassName}>{footer}</CardFooter>}
    </Component>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Subtitle = CardSubtitle;
Card.Actions = CardActions;
Card.Body = CardBody;
Card.Footer = CardFooter;
