import type { ReactNode, Ref } from 'react';

import type { Alignment } from '../hooks';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string | Date;
  severity?: NotificationSeverity;
  read?: boolean;
  actionLabel?: string;
  onAction?: (item: NotificationItem) => void;
}

export interface NotificationMenuProps {
  /** React 19 native DOM ref forwarded directly to the trigger button */
  ref?: Ref<HTMLButtonElement>;

  /** List of notification items to render */
  notifications: NotificationItem[];

  /** Callback fired when a notification item row is clicked */
  onItemClick?: (item: NotificationItem) => void;

  /** Callback fired when user clicks "Mark all as read" */
  onMarkAllAsRead?: () => void;

  /** Callback fired when user dismisses a notification row */
  onDismissItem?: (id: string) => void;

  /** Callback fired when user clicks the "View all" action in the footer */
  onViewAll?: () => void;

  /** Custom label for the footer action button (default: "View all activity") */
  viewAllLabel?: string;

  /** Message rendered when notification list is empty */
  emptyText?: string;

  /** Subtitle rendered below emptyText */
  emptyDescription?: string;

  /** Alignment of popover relative to trigger button (default: 'end') */
  alignment?: Alignment;

  /** Custom trigger icon replacement for the default Bell */
  triggerIcon?: ReactNode;

  /** Accessible label for the trigger button */
  ariaLabel?: string;

  /** Whether the notification trigger is disabled */
  disabled?: boolean;

  /** Trigger button styling escape hatch */
  className?: string;

  /** Popover menu container styling escape hatch */
  popupClassName?: string;
}
