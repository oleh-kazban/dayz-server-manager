import { create } from 'zustand';

import type { NotificationItem, NotificationSeverity } from '@aegis/ui';

export const MAX_NOTIFICATIONS = 50;

export interface AddNotificationInput {
  id?: string;
  title: string;
  description?: string;
  severity?: NotificationSeverity;
  timestamp?: string | Date;
  read?: boolean;
  actionLabel?: string;
  onAction?: (item: NotificationItem) => void;
}

export interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (input: AddNotificationInput) => NotificationItem | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

let fallbackSequence = 0;

function createNotificationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackSequence += 1;
  return `notif-${Date.now()}-${fallbackSequence}`;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: input => {
    const trimmedTitle = input.title.trim();
    if (trimmedTitle.length === 0) {
      return null;
    }

    let resolvedId: string;
    if (input.id !== undefined) {
      const trimmedId = input.id.trim();
      if (trimmedId.length === 0) {
        return null;
      }
      if (get().notifications.some(existing => existing.id === trimmedId)) {
        return null;
      }
      resolvedId = trimmedId;
    } else {
      resolvedId = createNotificationId();
    }

    const item: NotificationItem = {
      ...input,
      id: resolvedId,
      title: trimmedTitle,
      severity: input.severity ?? 'info',
      read: input.read ?? false,
      timestamp: input.timestamp ?? new Date(),
    };

    set(state => ({
      notifications: [item, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
    }));

    return item;
  },

  markAsRead: id =>
    set(state => {
      const target = state.notifications.find(item => item.id === id);
      if (!target || target.read) {
        return state;
      }

      return {
        notifications: state.notifications.map(item =>
          item.id === id ? { ...item, read: true } : item,
        ),
      };
    }),

  markAllAsRead: () =>
    set(state => {
      if (state.notifications.length === 0 || state.notifications.every(item => item.read)) {
        return state;
      }

      return {
        notifications: state.notifications.map(item =>
          item.read ? item : { ...item, read: true },
        ),
      };
    }),

  dismissNotification: id =>
    set(state => {
      if (!state.notifications.some(item => item.id === id)) {
        return state;
      }

      return {
        notifications: state.notifications.filter(item => item.id !== id),
      };
    }),

  clearAll: () =>
    set(state => {
      if (state.notifications.length === 0) {
        return state;
      }

      return { notifications: [] };
    }),
}));
