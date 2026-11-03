import { type ComponentType, type ReactNode, type Ref } from 'react';

import { type LucideIcon } from 'lucide-react';

export type NoticeVariant = 'info' | 'warning' | 'error' | 'danger' | 'success';

export interface NoticeProps {
  /** React 19 native DOM ref forwarded to the root element */
  ref?: Ref<HTMLDivElement>;

  /**
   * Semantic severity driving theme color, default icon, and ARIA live region behavior.
   * @default 'info'
   */
  variant?: NoticeVariant;

  /** Optional heading or strong lead for the notice */
  title?: ReactNode;

  /** Main message content */
  children?: ReactNode;

  /**
   * Custom icon element, Lucide icon component, or `false` to suppress the leading icon.
   * Defaults to variant-specific semantic icon.
   */
  icon?: LucideIcon | ComponentType<{ className?: string }> | ReactNode | false;

  /** Optional secondary action slot (e.g. retry button, external docs link) */
  action?: ReactNode;

  /**
   * Callback invoked when the dismiss close button is clicked.
   * When provided, a close button is automatically rendered.
   */
  onClose?: () => void;

  /**
   * Accessible label for the dismiss close button.
   * @default 'Dismiss notice'
   */
  closeLabel?: string;

  /** ARIA role for container */
  role?: string;

  /** HTML id attribute */
  id?: string;

  /** Optional root container className escape hatch */
  className?: string;
}
