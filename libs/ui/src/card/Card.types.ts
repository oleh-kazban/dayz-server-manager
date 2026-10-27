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
