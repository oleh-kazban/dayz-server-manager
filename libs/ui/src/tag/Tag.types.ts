import type { ElementType, MouseEvent, ReactNode, Ref } from 'react';

import type { LucideIcon } from 'lucide-react';

export type TagVariant = 'subtle' | 'solid' | 'outline' | 'neutral';

export type TagColor =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'gray';

export type TagShape = 'rounded' | 'pill';

export type TagIcon = LucideIcon | ElementType | ReactNode;

export type SemanticTagColor = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface TagProps {
  /**
   * React 19 ref forwarded directly to the native <span> badge element.
   */
  ref?: Ref<HTMLSpanElement>;

  /**
   * Visual stylistic variant of the tag badge.
   * @default 'subtle'
   */
  variant?: TagVariant;

  /**
   * Color variant mapping to DSM semantic tokens or tactical taxonomy.
   * @default 'default'
   */
  color?: TagColor;

  /**
   * Border radius shape (rounded: 6px, pill: full rounded).
   * @default 'rounded'
   */
  shape?: TagShape;

  /** Leading icon or Lucide component */
  leftIcon?: TagIcon;

  /** Trailing icon or Lucide component */
  rightIcon?: TagIcon;

  /** Callback fired when dismiss button is clicked */
  onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;

  /** Accessible label for the remove button */
  removeAriaLabel?: string;

  /** Transforms text to uppercase with tracking-wider */
  uppercase?: boolean;

  /** Renders content with monospace font */
  mono?: boolean;

  /** Disables interactions and reduces opacity */
  disabled?: boolean;

  /** Single external class escape hatch */
  customClassName?: string;

  children?: ReactNode;
  className?: string;
  id?: string;
  title?: string;
  'aria-label'?: string;
}
