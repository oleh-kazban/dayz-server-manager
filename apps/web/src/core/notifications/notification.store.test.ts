import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_NOTIFICATIONS, useNotificationStore } from './notification.store';

const initialNotificationsOnLoad = useNotificationStore.getState().notifications;

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes with an empty notifications array for production mock parity (REQ-06, GUARD-02)', () => {
    expect(initialNotificationsOnLoad).toEqual([]);
  });

  it('prepends newest notifications first with default severity, read=false, unique id, and timestamp (REQ-02)', () => {
    const { addNotification } = useNotificationStore.getState();

    const first = addNotification({ title: '  First alert  ', description: 'Details 1' });
    const second = addNotification({ title: 'Second alert', severity: 'warning' });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.id).toBeTruthy();
    expect(second!.id).toBeTruthy();
    expect(second!.id).not.toBe(first!.id);
    expect(first!.title).toBe('First alert');
    expect(first!.severity).toBe('info');
    expect(first!.read).toBe(false);
    expect(first!.timestamp).toBeInstanceOf(Date);
    expect(second!.severity).toBe('warning');

    const stored = useNotificationStore.getState().notifications;
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe(second!.id);
    expect(stored[1].id).toBe(first!.id);
  });

  it('generates fallback IDs when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    const { addNotification } = useNotificationStore.getState();

    const first = addNotification({ title: 'Fallback 1' });
    const second = addNotification({ title: 'Fallback 2' });

    expect(first?.id).toMatch(/^notif-\d+-1$/);
    expect(second?.id).toMatch(/^notif-\d+-2$/);
  });

  it('retains at most MAX_NOTIFICATIONS (50) newest items and preserves duplicate titles (REQ-02, Q3)', () => {
    expect(MAX_NOTIFICATIONS).toBe(50);
    const { addNotification } = useNotificationStore.getState();

    for (let i = 1; i <= 55; i += 1) {
      addNotification({ title: i <= 2 ? 'Duplicate Title' : `Alert ${i}` });
    }

    const stored = useNotificationStore.getState().notifications;
    expect(stored).toHaveLength(50);
    expect(stored[0].title).toBe('Alert 55');
    expect(stored[49].title).toBe('Alert 6');

    addNotification({ title: 'Duplicate Title' });
    addNotification({ title: 'Duplicate Title' });

    const afterDuplicates = useNotificationStore.getState().notifications;
    expect(afterDuplicates).toHaveLength(50);
    expect(afterDuplicates[0].title).toBe('Duplicate Title');
    expect(afterDuplicates[1].title).toBe('Duplicate Title');
    expect(afterDuplicates[0].id).not.toBe(afterDuplicates[1].id);
  });

  it('marks a single notification as read, marks all as read, dismisses, and clears all (REQ-02)', () => {
    const { addNotification, markAsRead, markAllAsRead, dismissNotification, clearAll } =
      useNotificationStore.getState();

    const oldest = addNotification({ title: 'Oldest' })!;
    const middle = addNotification({ title: 'Middle', read: true })!;
    const newest = addNotification({ title: 'Newest' })!;

    markAsRead(newest.id);
    let stored = useNotificationStore.getState().notifications;
    expect(stored.find(n => n.id === newest.id)?.read).toBe(true);
    expect(stored.find(n => n.id === oldest.id)?.read).toBe(false);

    markAllAsRead();
    stored = useNotificationStore.getState().notifications;
    expect(stored.every(n => n.read)).toBe(true);

    dismissNotification(middle.id);
    stored = useNotificationStore.getState().notifications;
    expect(stored.map(n => n.id)).toEqual([newest.id, oldest.id]);

    clearAll();
    expect(useNotificationStore.getState().notifications).toEqual([]);
  });

  it('refuses blank titles, unknown IDs, already-read IDs, and empty no-ops without mutating state (GUARD-01)', () => {
    const { addNotification, markAsRead, markAllAsRead, dismissNotification, clearAll } =
      useNotificationStore.getState();

    // Empty store no-ops
    const emptyBefore = useNotificationStore.getState().notifications;
    markAllAsRead();
    expect(useNotificationStore.getState().notifications).toBe(emptyBefore);
    clearAll();
    expect(useNotificationStore.getState().notifications).toBe(emptyBefore);

    // Blank title refusal
    const rejected = addNotification({ title: '   \t\n  ' });
    expect(rejected).toBeNull();
    expect(useNotificationStore.getState().notifications).toBe(emptyBefore);

    // Seed one unread and one read item
    const unread = addNotification({ title: 'Unread item' })!;
    const readItem = addNotification({ title: 'Already read', read: true })!;
    const snapshot = useNotificationStore.getState().notifications;

    // Unknown ID & already-read ID refusals preserve exact array reference
    markAsRead('missing-id');
    expect(useNotificationStore.getState().notifications).toBe(snapshot);

    markAsRead(readItem.id);
    expect(useNotificationStore.getState().notifications).toBe(snapshot);

    dismissNotification('missing-id');
    expect(useNotificationStore.getState().notifications).toBe(snapshot);

    // Mark remaining unread item read, then markAllAsRead becomes a no-op
    markAsRead(unread.id);
    const allReadSnapshot = useNotificationStore.getState().notifications;
    markAllAsRead();
    expect(useNotificationStore.getState().notifications).toBe(allReadSnapshot);
  });
});
