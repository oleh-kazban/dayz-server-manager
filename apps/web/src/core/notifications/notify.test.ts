import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@aegis/api-client';
import { showToast } from '@aegis/ui';

import { useNotificationStore } from './notification.store';
import { notifyApiError, notifyInfo, notifySuccess } from './notify';

vi.mock('@aegis/ui', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/ui')>();
  return {
    ...actual,
    showToast: {
      ...actual.showToast,
      success: vi.fn(() => 'toast-success-id'),
      info: vi.fn(() => 'toast-info-id'),
      error: vi.fn(() => 'toast-error-id'),
    },
  };
});

describe('notify bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({ notifications: [] });
  });

  it('notifySuccess dispatches showToast.success and records unread success notification (REQ-03)', () => {
    const toastId = notifySuccess('SERVER_CREATED', { name: 'Chernarus 1PP' }, 5000);

    expect(toastId).toBe('toast-success-id');
    expect(showToast.success).toHaveBeenCalledWith(
      'Server Created',
      'Server "Chernarus 1PP" has been created successfully.',
      5000,
    );

    const stored = useNotificationStore.getState().notifications;
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      title: 'Server Created',
      description: 'Server "Chernarus 1PP" has been created successfully.',
      severity: 'success',
      read: false,
    });
  });

  it('notifyInfo dispatches showToast.info and records unread info notification with or without description (REQ-03)', () => {
    const firstToastId = notifyInfo('Sync Started', 'Workshop mods are updating.', 3000);
    const secondToastId = notifyInfo('Maintenance Window');

    expect(firstToastId).toBe('toast-info-id');
    expect(secondToastId).toBe('toast-info-id');
    expect(showToast.info).toHaveBeenNthCalledWith(
      1,
      'Sync Started',
      'Workshop mods are updating.',
      3000,
    );
    expect(showToast.info).toHaveBeenNthCalledWith(2, 'Maintenance Window', undefined, undefined);

    const stored = useNotificationStore.getState().notifications;
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({
      title: 'Maintenance Window',
      description: undefined,
      severity: 'info',
      read: false,
    });
    expect(stored[1]).toMatchObject({
      title: 'Sync Started',
      description: 'Workshop mods are updating.',
      severity: 'info',
      read: false,
    });
  });

  it('notifyApiError dispatches showToast.error and records unread danger notification for ApiError and fallback errors (REQ-03)', () => {
    const apiErr = new ApiError('Conflict', 409, {
      statusCode: 409,
      error: 'Conflict',
      errorCode: 'SERVER_NAME_CONFLICT',
      message: 'Exists',
      params: { name: 'Namalsk' },
    });

    const firstToastId = notifyApiError(apiErr, 'Create Failed', undefined, 6000);
    const secondToastId = notifyApiError(null);

    expect(firstToastId).toBe('toast-error-id');
    expect(secondToastId).toBe('toast-error-id');
    expect(showToast.error).toHaveBeenNthCalledWith(
      1,
      'Server Name Conflict',
      'A server named "Namalsk" already exists. Please choose a unique name.',
      6000,
    );
    expect(showToast.error).toHaveBeenNthCalledWith(
      2,
      'Operation Failed',
      'An unexpected error occurred. Please try again.',
      undefined,
    );

    const stored = useNotificationStore.getState().notifications;
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({
      title: 'Operation Failed',
      description: 'An unexpected error occurred. Please try again.',
      severity: 'danger',
      read: false,
    });
    expect(stored[1]).toMatchObject({
      title: 'Server Name Conflict',
      description: 'A server named "Namalsk" already exists. Please choose a unique name.',
      severity: 'danger',
      read: false,
    });
  });
});
