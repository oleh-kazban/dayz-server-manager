import type { ApiErrorParams } from '@aegis/api-contracts';
import { showToast } from '@aegis/ui';

import { type NotificationCode, resolveApiErrorMessage, resolveNotificationMessage } from '../i18n';

export function notifySuccess(
  code: NotificationCode,
  params?: ApiErrorParams,
  duration?: number,
): string {
  const { title, description } = resolveNotificationMessage(code, params);
  return showToast.success(title, description, duration);
}

export function notifyInfo(title: string, description?: string, duration?: number): string {
  return showToast.info(title, description, duration);
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
