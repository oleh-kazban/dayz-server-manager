import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type OlHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';

export interface BreadcrumbItemData {
  /** Optional key identifier */
  id?: string;

  /** Display label for the breadcrumb item */
  label: ReactNode;

  /** Destination URL */
  href?: string;

  /** Optional leading icon */
  icon?: ReactNode;

  /** Whether this item denotes the active current page */
  isCurrent?: boolean;

  /** Click callback (useful for programmatic routing) */
  onClick?: (_event: MouseEvent<HTMLElement>) => void;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  /** React 19 native ref forwarded to the root <nav> element */
  ref?: Ref<HTMLElement>;

  /**
   * Data-driven items array.
   * If provided, automatically renders the full breadcrumb trail.
   */
  items?: BreadcrumbItemData[];

  /** Compound children (BreadcrumbList, BreadcrumbItem, etc.) */
  children?: ReactNode;

  /**
   * Custom separator rendered between items.
   * Defaults to <ChevronRight className="w-3.5 h-3.5" />.
   */
  separator?: ReactNode;

  /**
   * Maximum number of items to display before collapsing with an ellipsis.
   */
  maxItems?: number;

  /**
   * Number of items to retain before the ellipsis when collapsed.
   * @default 1
   */
  itemsBeforeCollapse?: number;

  /**
   * Number of items to retain after the ellipsis when collapsed.
   * @default 2
   */
  itemsAfterCollapse?: number;

  /** Accessible label for the navigation landmark */
  'aria-label'?: string;

  /** Root navigation container className */
  className?: string;
}

export interface BreadcrumbListProps extends OlHTMLAttributes<HTMLOListElement> {
  ref?: Ref<HTMLOListElement>;
  children?: ReactNode;
  className?: string;
}

export interface BreadcrumbItemProps extends HTMLAttributes<HTMLLIElement> {
  ref?: Ref<HTMLLIElement>;
  children?: ReactNode;
  className?: string;
}

export interface BreadcrumbLinkProps {
  ref?: Ref<HTMLAnchorElement>;
  href?: string;
  icon?: ReactNode;
  onClick?: (_event: MouseEvent<HTMLElement>) => void;
  asChild?: boolean;
  children?: ReactNode;
  className?: string;
  'aria-label'?: string;
  target?: string;
  rel?: string;
  id?: string;
  title?: string;
}

export interface BreadcrumbPageProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;

  /** Optional leading icon */
  icon?: ReactNode;

  children?: ReactNode;
  className?: string;
}

export interface BreadcrumbSeparatorProps extends HTMLAttributes<HTMLLIElement> {
  ref?: Ref<HTMLLIElement>;
  children?: ReactNode;
  className?: string;
}

export interface BreadcrumbEllipsisProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  className?: string;
}
