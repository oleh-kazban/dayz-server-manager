import { getEmptyStateTitleClasses, getEmptyStateVariantClasses } from './empty-state.utils';
import type {
  EmptyStateActionsProps,
  EmptyStateDescriptionProps,
  EmptyStateIconProps,
  EmptyStateProps,
  EmptyStateTitleProps,
} from './EmptyState.types';

export function EmptyStateIcon({ ref, className = '', children, ...props }: EmptyStateIconProps) {
  return (
    <div
      ref={ref}
      data-testid="empty-state-icon"
      className={`p-3 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]/60 shadow-xs mb-3.5 shrink-0 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function EmptyStateTitle({
  ref,
  as: Tag = 'h3',
  className = '',
  children,
  ...props
}: EmptyStateTitleProps) {
  return (
    <Tag
      ref={ref}
      className={`text-sm sm:text-base font-semibold text-[var(--color-text-main)] tracking-tight ${className}`.trim()}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function EmptyStateDescription({
  ref,
  className = '',
  children,
  ...props
}: EmptyStateDescriptionProps) {
  return (
    <p
      ref={ref}
      className={`text-xs sm:text-[13px] text-[var(--color-text-muted)] leading-relaxed max-w-sm mt-1 ${className}`.trim()}
      {...props}
    >
      {children}
    </p>
  );
}

export function EmptyStateActions({
  ref,
  className = '',
  children,
  ...props
}: EmptyStateActionsProps) {
  return (
    <div
      ref={ref}
      className={`mt-5 flex items-center justify-center gap-2.5 flex-wrap ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  ref,
  icon,
  title,
  titleAs = 'h3',
  description,
  action,
  variant = 'default',
  className = '',
  children,
  ...props
}: EmptyStateProps) {
  const variantClasses = getEmptyStateVariantClasses(variant);
  const titleClasses = getEmptyStateTitleClasses(variant);

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center justify-center text-center max-w-md mx-auto ${variantClasses} ${className}`.trim()}
      {...props}
    >
      {children ?? (
        <>
          {icon && <EmptyStateIcon>{icon}</EmptyStateIcon>}
          {title && (
            <EmptyStateTitle as={titleAs} className={titleClasses}>
              {title}
            </EmptyStateTitle>
          )}
          {description && <EmptyStateDescription>{description}</EmptyStateDescription>}
          {action && <EmptyStateActions>{action}</EmptyStateActions>}
        </>
      )}
    </div>
  );
}

EmptyState.Icon = EmptyStateIcon;
EmptyState.Title = EmptyStateTitle;
EmptyState.Description = EmptyStateDescription;
EmptyState.Actions = EmptyStateActions;
