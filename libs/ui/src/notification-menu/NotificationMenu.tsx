import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Info,
  type LucideIcon,
  X,
} from 'lucide-react';

import { usePopup } from '../hooks';

import {
  type NotificationItem,
  type NotificationMenuProps,
  type NotificationSeverity,
} from './NotificationMenu.types';

const SEVERITY_CONFIG: Record<
  NotificationSeverity,
  { icon: LucideIcon; colorClass: string; bgClass: string }
> = {
  info: {
    icon: Info,
    colorClass: 'text-[var(--color-status-info)]',
    bgClass: 'bg-[var(--color-status-info-light)]',
  },
  success: {
    icon: CheckCircle2,
    colorClass: 'text-[var(--color-status-success)]',
    bgClass: 'bg-[var(--color-status-success-light)]',
  },
  warning: {
    icon: AlertTriangle,
    colorClass: 'text-[var(--color-status-warning)]',
    bgClass: 'bg-[var(--color-status-warning-light)]',
  },
  danger: {
    icon: AlertCircle,
    colorClass: 'text-[var(--color-status-danger)]',
    bgClass: 'bg-[var(--color-status-danger-light)]',
  },
};

function formatTimestamp(timestamp: string | Date): string {
  if (typeof timestamp === 'string') return timestamp;
  try {
    const diffMs = Date.now() - timestamp.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  } catch {
    return String(timestamp);
  }
}

interface NotificationHeaderProps {
  unreadCount: number;
  onMarkAllAsRead?: () => void;
}

function NotificationHeader({ unreadCount, onMarkAllAsRead }: NotificationHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--color-text-main)]">Notifications</span>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary-border)]">
            {unreadCount} new
          </span>
        )}
      </div>

      {unreadCount > 0 && onMarkAllAsRead && (
        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded cursor-pointer"
        >
          <Check className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
          <span>Mark all as read</span>
        </button>
      )}
    </div>
  );
}

interface NotificationItemRowProps {
  item: NotificationItem;
  onItemClick?: (item: NotificationItem) => void;
  onDismissItem?: (id: string) => void;
}

function NotificationItemRow({ item, onItemClick, onDismissItem }: NotificationItemRowProps) {
  const severity = item.severity ?? 'info';
  const config = SEVERITY_CONFIG[severity];
  const IconComponent = config.icon;
  const isUnread = !item.read;

  return (
    <div
      className={`group relative flex items-start gap-3 px-3.5 py-3 transition-colors text-left ${
        isUnread
          ? 'bg-[var(--color-primary-light)]/20 hover:bg-[var(--color-primary-light)]/30'
          : 'bg-transparent hover:bg-[var(--color-surface-subtle)]'
      }`}
    >
      {/* Unread indicator pip */}
      {isUnread && (
        <span
          aria-hidden="true"
          className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"
        />
      )}

      {/* Severity Icon Badge */}
      <div
        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${config.bgClass} ${config.colorClass}`}
      >
        <IconComponent className="w-3.5 h-3.5" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        {onItemClick ? (
          <button
            type="button"
            onClick={() => onItemClick(item)}
            className="w-full text-left focus-visible:outline-none cursor-pointer"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-xs block truncate ${
                  isUnread
                    ? 'font-semibold text-[var(--color-text-main)]'
                    : 'font-medium text-[var(--color-text-main)]'
                }`}
              >
                {item.title}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] font-mono shrink-0">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>

            {item.description && (
              <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 mt-0.5 leading-snug">
                {item.description}
              </p>
            )}
          </button>
        ) : (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-xs block truncate ${
                  isUnread
                    ? 'font-semibold text-[var(--color-text-main)]'
                    : 'font-medium text-[var(--color-text-main)]'
                }`}
              >
                {item.title}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] font-mono shrink-0">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>

            {item.description && (
              <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 mt-0.5 leading-snug">
                {item.description}
              </p>
            )}
          </div>
        )}

        {item.actionLabel && item.onAction && (
          <button
            type="button"
            onClick={() => item.onAction?.(item)}
            className="mt-1.5 text-[11px] font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center cursor-pointer"
          >
            {item.actionLabel} &rarr;
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {onDismissItem && (
        <button
          type="button"
          aria-label={`Dismiss notification: ${item.title}`}
          onClick={() => onDismissItem(item.id)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer absolute right-2 top-2.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function NotificationEmptyState({
  emptyText,
  emptyDescription,
}: {
  emptyText?: string;
  emptyDescription?: string;
}) {
  return (
    <div className="py-8 px-4 text-center select-none">
      <BellOff
        className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-muted)] opacity-40"
        aria-hidden="true"
      />
      <p className="text-xs font-medium text-[var(--color-text-main)]">
        {emptyText ?? 'No notifications'}
      </p>
      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
        {emptyDescription ?? "You're all caught up with server activity"}
      </p>
    </div>
  );
}

export function NotificationMenu({
  ref,
  notifications,
  onItemClick,
  onMarkAllAsRead,
  onDismissItem,
  onViewAll,
  viewAllLabel = 'View all activity',
  emptyText,
  emptyDescription,
  alignment = 'end',
  triggerIcon,
  ariaLabel,
  disabled = false,
  className = '',
  popupClassName = '',
}: NotificationMenuProps) {
  const menuId = useId();
  const panelId = `${menuId}-panel`;

  const { isOpen, close, toggle, popupPosition, containerRef, triggerRef, popupRef } =
    usePopup(alignment);

  const handleTriggerRef = (element: HTMLButtonElement | null) => {
    triggerRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    } else if (ref && 'current' in ref) {
      (ref as { current: HTMLButtonElement | null }).current = element;
    }
  };

  useEffect(() => {
    if (disabled && isOpen) {
      close();
    }
  }, [disabled, isOpen, close]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const computedAriaLabel =
    ariaLabel ??
    (unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications (no unread)');

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        ref={handleTriggerRef}
        id={menuId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={computedAriaLabel}
        disabled={disabled}
        onClick={toggle}
        className={`relative flex items-center justify-center h-9 w-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
          isOpen ? 'bg-[var(--color-surface-hover)] border-[var(--color-border-hover)]' : ''
        } ${className}`.trim()}
      >
        {triggerIcon ?? (
          <Bell className="w-4 h-4 text-[var(--color-text-main)]" aria-hidden="true" />
        )}

        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white shadow-xs pointer-events-none leading-none"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            id={panelId}
            role="dialog"
            aria-label={ariaLabel ?? 'Notifications'}
            onKeyDown={handleKeyDown}
            style={{
              position: 'fixed',
              top: popupPosition ? `${popupPosition.top}px` : '0px',
              left: popupPosition ? `${popupPosition.left}px` : '0px',
              zIndex: 50,
              visibility: popupPosition ? 'visible' : 'hidden',
            }}
            className={`w-84 sm:w-96 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden font-sans select-none animate-in fade-in zoom-in-95 duration-100 flex flex-col ${popupClassName}`.trim()}
          >
            {/* Header */}
            <NotificationHeader unreadCount={unreadCount} onMarkAllAsRead={onMarkAllAsRead} />

            {/* Notification items list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border-subtle)]">
              {notifications.length === 0 ? (
                <NotificationEmptyState emptyText={emptyText} emptyDescription={emptyDescription} />
              ) : (
                notifications.map(item => (
                  <NotificationItemRow
                    key={item.id}
                    item={item}
                    onItemClick={onItemClick}
                    onDismissItem={onDismissItem}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {onViewAll && (
              <div className="p-2 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]/50 text-center">
                <button
                  type="button"
                  onClick={onViewAll}
                  className="w-full py-1 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] cursor-pointer"
                >
                  {viewAllLabel} &rarr;
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
