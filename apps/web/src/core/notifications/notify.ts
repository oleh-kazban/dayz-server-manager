import type { ApiErrorParams } from '@dsm/api-contracts';
import { showToast } from '@dsm/ui';

import { type NotificationCode, resolveApiErrorMessage, resolveNotificationMessage } from '../i18n';

export function notifySuccess(
  code: NotificationCode,
  params?: ApiErrorParams,
  duration?: number,
): string {
  const { title, description } = resolveNotificationMessage(code, params);
  return showToast.success(title, description, duration);
}

export function notifyApiError(
  error: unknown,
  fallbackTitle = 'Operation Failed',
  fallbackDescription = 'An unexpected error occurred. Please try again.',
  duration?: number,
): string {
  const { title, description } = resolveApiErrorMessage(error, fallbackTitle, fallbackDescription);
  return showToast.error(title, description, duration);
}
