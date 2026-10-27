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
import { formatTimestamp } from '../utils';

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

interface NotificationHeaderProps {
  unreadCount: number;
  onMarkAllAsRead?: () => void;
}

function NotificationHeader({ unreadCount, onMarkAllAsRead }: NotificationHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--color-text-main)] tracking-tight">
          Notifications
        </span>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            {unreadCount} new
          </span>
        )}
      </div>

      {unreadCount > 0 && onMarkAllAsRead && (
        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] rounded cursor-pointer"
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
      className={`group relative flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition-all ${
        isUnread
          ? 'bg-[var(--color-surface-subtle)] border border-[var(--color-border)] shadow-2xs hover:border-[var(--color-border-hover)]'
          : 'bg-transparent border border-transparent hover:bg-[var(--color-surface-subtle)]'
      }`}
    >
      {/* Circular Severity Badge */}
      <div
        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${config.bgClass} ${config.colorClass}`}
      >
        <IconComponent className="w-4 h-4" aria-hidden="true" />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {onItemClick ? (
          <button
            type="button"
            onClick={() => onItemClick(item)}
            className="block w-full text-left focus-visible:outline-none cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {isUnread && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`text-xs block truncate ${
                    isUnread
                      ? 'font-semibold text-[var(--color-text-main)]'
                      : 'font-medium text-[var(--color-text-secondary)]'
                  }`}
                >
                  {item.title}
                </span>
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)] font-normal shrink-0">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>

            {item.description && (
              <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
                {item.description}
              </p>
            )}
          </button>
        ) : (
          <div className="w-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {isUnread && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`text-xs block truncate ${
                    isUnread
                      ? 'font-semibold text-[var(--color-text-main)]'
                      : 'font-medium text-[var(--color-text-secondary)]'
                  }`}
                >
                  {item.title}
                </span>
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)] font-normal shrink-0">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>

            {item.description && (
              <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        )}

        {item.actionLabel && item.onAction && (
          <button
            type="button"
            onClick={() => item.onAction?.(item)}
            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors cursor-pointer"
          >
            <span>{item.actionLabel}</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {onDismissItem && (
        <button
          type="button"
          aria-label={`Dismiss notification: ${item.title}`}
          onClick={() => onDismissItem(item.id)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer shrink-0"
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
    <div className="py-10 px-4 text-center select-none">
      <div className="w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-2.5 text-[var(--color-text-muted)]">
        <BellOff className="w-5 h-5 opacity-60" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold text-[var(--color-text-main)]">
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
            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white shadow-xs ring-2 ring-[var(--color-surface)] pointer-events-none leading-none"
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
            className={`w-96 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden font-sans select-none animate-in fade-in zoom-in-95 duration-100 flex flex-col ${popupClassName}`.trim()}
          >
            {/* Header */}
            <NotificationHeader unreadCount={unreadCount} onMarkAllAsRead={onMarkAllAsRead} />

            {/* Notification items list */}
            <div className="max-h-84 overflow-y-auto p-1.5 space-y-1">
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
              <div className="p-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                <button
                  type="button"
                  onClick={onViewAll}
                  className="w-full py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-subtle)] transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] cursor-pointer text-center"
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
