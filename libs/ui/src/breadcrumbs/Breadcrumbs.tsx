import { cloneElement, Fragment, isValidElement, type ReactElement, useState } from 'react';

import { ChevronRight, MoreHorizontal } from 'lucide-react';

import {
  type BreadcrumbEllipsisProps,
  type BreadcrumbItemData,
  type BreadcrumbItemProps,
  type BreadcrumbLinkProps,
  type BreadcrumbListProps,
  type BreadcrumbPageProps,
  type BreadcrumbSeparatorProps,
  type BreadcrumbsProps,
} from './Breadcrumbs.types';

/* --------------------------------------------------------------------------
   COMPOUND SUBCOMPONENTS
   -------------------------------------------------------------------------- */

export function BreadcrumbList({ ref, children, className = '', ...props }: BreadcrumbListProps) {
  return (
    <ol
      ref={ref}
      className={`flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-sans ${className}`.trim()}
      {...props}
    >
      {children}
    </ol>
  );
}

export function BreadcrumbItem({ ref, children, className = '', ...props }: BreadcrumbItemProps) {
  return (
    <li ref={ref} className={`inline-flex items-center gap-1.5 ${className}`.trim()} {...props}>
      {children}
    </li>
  );
}

export function BreadcrumbLink({
  ref,
  href,
  icon,
  onClick,
  asChild = false,
  children,
  className = '',
  ...props
}: BreadcrumbLinkProps) {
  const baseClasses =
    `hover:text-[var(--color-text-main)] transition-colors inline-flex items-center gap-1.5 font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded ${className}`.trim();

  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ className?: string }>, {
      className:
        `${baseClasses} ${(children.props as { className?: string }).className || ''}`.trim(),
    });
  }

  if (href) {
    return (
      <a ref={ref} href={href} onClick={onClick} className={baseClasses} {...props}>
        {icon && <span className="shrink-0 text-current">{icon}</span>}
        {children}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        {icon && <span className="shrink-0 text-current">{icon}</span>}
        {children}
      </button>
    );
  }

  return (
    <span className={baseClasses}>
      {icon && <span className="shrink-0 text-current">{icon}</span>}
      {children}
    </span>
  );
}

export function BreadcrumbPage({
  ref,
  icon,
  children,
  className = '',
  ...props
}: BreadcrumbPageProps) {
  return (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={`font-semibold text-[var(--color-text-main)] inline-flex items-center gap-1.5 ${className}`.trim()}
      {...props}
    >
      {icon && <span className="shrink-0 text-current">{icon}</span>}
      {children}
    </span>
  );
}

export function BreadcrumbSeparator({
  ref,
  children,
  className = '',
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={`text-[var(--color-text-muted)] select-none shrink-0 inline-flex items-center ${className}`.trim()}
      {...props}
    >
      {children ?? <ChevronRight className="w-3.5 h-3.5" />}
    </li>
  );
}

export function BreadcrumbEllipsis({
  ref,
  className = '',
  onClick,
  ...props
}: BreadcrumbEllipsisProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Show more breadcrumbs"
      onClick={onClick}
      className={`p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-subtle)] transition-colors inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] ${className}`.trim()}
      {...props}
    >
      <MoreHorizontal className="w-3.5 h-3.5" />
    </button>
  );
}

/* --------------------------------------------------------------------------
   DATA-DRIVEN RENDERING HELPER
   -------------------------------------------------------------------------- */

function renderCrumbItem(item: BreadcrumbItemData, isLast: boolean) {
  const isLeaf = item.isCurrent ?? isLast;

  if (isLeaf) {
    return <BreadcrumbPage icon={item.icon}>{item.label}</BreadcrumbPage>;
  }

  return (
    <BreadcrumbLink href={item.href} icon={item.icon} onClick={item.onClick}>
      {item.label}
    </BreadcrumbLink>
  );
}

/* --------------------------------------------------------------------------
   PRIMARY BREADCRUMBS WRAPPER
   -------------------------------------------------------------------------- */

export function Breadcrumbs({
  ref,
  items,
  children,
  separator,
  maxItems,
  itemsBeforeCollapse = 1,
  itemsAfterCollapse = 2,
  'aria-label': ariaLabel = 'Breadcrumb',
  className = '',
  ...props
}: BreadcrumbsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Data-driven mode
  if (items && items.length > 0) {
    const shouldCollapse = maxItems !== undefined && items.length > maxItems && !isExpanded;

    const visibleItems: { item: BreadcrumbItemData; index: number; isEllipsis?: boolean }[] = [];

    if (shouldCollapse) {
      const startCount = Math.max(1, itemsBeforeCollapse);
      const endCount = Math.max(1, itemsAfterCollapse);

      items.slice(0, startCount).forEach((item, index) => {
        visibleItems.push({ item, index });
      });

      visibleItems.push({
        item: { label: 'ellipsis', id: 'ellipsis' },
        index: -1,
        isEllipsis: true,
      });

      const tail = items.slice(items.length - endCount);
      tail.forEach((item, idx) => {
        visibleItems.push({ item, index: items.length - endCount + idx });
      });
    } else {
      items.forEach((item, index) => {
        visibleItems.push({ item, index });
      });
    }

    return (
      <nav ref={ref} aria-label={ariaLabel} className={`w-full ${className}`.trim()} {...props}>
        <BreadcrumbList>
          {visibleItems.map((entry, i) => {
            const isLast = i === visibleItems.length - 1;

            if (entry.isEllipsis) {
              return (
                <Fragment key="ellipsis">
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis onClick={() => setIsExpanded(true)} />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
                </Fragment>
              );
            }

            return (
              <Fragment key={entry.item.id ?? entry.index}>
                <BreadcrumbItem>
                  {renderCrumbItem(entry.item, entry.index === items.length - 1)}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </nav>
    );
  }

  // Compound component mode
  return (
    <nav ref={ref} aria-label={ariaLabel} className={`w-full ${className}`.trim()} {...props}>
      {children}
    </nav>
  );
}
