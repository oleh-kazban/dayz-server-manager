import type { HTMLAttributes, ReactNode, Ref } from 'react';

export type EmptyStateVariant = 'default' | 'dashed' | 'compact';
export type EmptyStateTitleTag = 'h2' | 'h3' | 'h4' | 'h5';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Decorative icon or visual badge.
   */
  icon?: ReactNode;

  /**
   * Primary title or headline (e.g. "No survivors online", "No matching search results").
   */
  title?: ReactNode;

  /**
   * Semantic heading level for the title element.
   * @default 'h3'
   */
  titleAs?: EmptyStateTitleTag;

  /**
   * Detailed explanatory copy explaining why the section is empty or how to resolve it.
   */
  description?: ReactNode;

  /**
   * Action button slot (e.g. <Button>Clear filters</Button> or <Button>Install Mod</Button>).
   */
  action?: ReactNode;

  /**
   * Visual framing variant:
   * - `default`: Unbordered, transparent surface. Ideal within existing cards or table rows.
   * - `dashed`: Contained surface with subtle dashed border. Ideal for dropzones or standalone sections.
   * - `compact`: Reduced padding for small widgets or narrow sidebars.
   * @default 'default'
   */
  variant?: EmptyStateVariant;

  /**
   * Forwarded React 19 ref for the root container.
   */
  ref?: Ref<HTMLDivElement>;

  /**
   * Custom child elements for slot-based compound composition.
   */
  children?: ReactNode;
}

export interface EmptyStateIconProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface EmptyStateTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: EmptyStateTitleTag;
  ref?: Ref<HTMLHeadingElement>;
  children?: ReactNode;
}

export interface EmptyStateDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  ref?: Ref<HTMLParagraphElement>;
  children?: ReactNode;
}

export interface EmptyStateActionsProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}
