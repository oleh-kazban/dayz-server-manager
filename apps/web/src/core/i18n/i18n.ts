import { initReactI18next } from 'react-i18next';

import i18n from 'i18next';

import { ApiError } from '@dsm/api-client';
import type { ApiErrorCode, ApiErrorParams, ApiFieldErrorsMap } from '@dsm/api-contracts';

import {
  enUSTranslations,
  type NotificationCode,
  type ToastTranslationEntry,
} from './locales/en-US';

export const resources = {
  'en-US': {
    translation: enUSTranslations,
  },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'en-US',
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false,
    },
  });
}

function isKnownErrorCode(code: unknown): code is ApiErrorCode {
  return typeof code === 'string' && code in enUSTranslations.errors;
}

function translateErrorCode(code: ApiErrorCode, params?: ApiErrorParams): ToastTranslationEntry {
  const safeParams = params ?? {};
  return {
    title: i18n.t(`errors.${code}.title`, safeParams),
    description: i18n.t(`errors.${code}.description`, safeParams),
  };
}

function extractErrorDetails(error: unknown): {
  errorCode?: ApiErrorCode;
  params?: ApiErrorParams;
  apiMessage?: string;
} {
  if (typeof ApiError === 'function' && error instanceof ApiError) {
    return {
      errorCode: isKnownErrorCode(error.errorCode) ? error.errorCode : undefined,
      params: error.params,
      apiMessage: error.apiMessage,
    };
  }

  if (error && typeof error === 'object') {
    const raw = error as {
      errorCode?: unknown;
      params?: ApiErrorParams;
      apiMessage?: unknown;
    };
    return {
      errorCode: isKnownErrorCode(raw.errorCode) ? raw.errorCode : undefined,
      params: raw.params,
      apiMessage:
        typeof raw.apiMessage === 'string' && raw.apiMessage.length > 0
          ? raw.apiMessage
          : undefined,
    };
  }

  return {};
}

export function resolveApiErrorMessage(
  error: unknown,
  fallbackTitle = 'Operation Failed',
  fallbackDescription = 'An unexpected error occurred. Please try again.',
): ToastTranslationEntry {
  const { errorCode, params, apiMessage } = extractErrorDetails(error);

  if (errorCode) {
    return translateErrorCode(errorCode, params);
  }

  if (apiMessage) {
    return {
      title: fallbackTitle,
      description: apiMessage,
    };
  }

  if (error instanceof Error && error.message) {
    return {
      title: fallbackTitle,
      description: error.message,
    };
  }

  return {
    title: fallbackTitle,
    description: fallbackDescription,
  };
}

export function extractApiFieldErrors(error: unknown): ApiFieldErrorsMap | undefined {
  if (typeof ApiError === 'function' && error instanceof ApiError) {
    return error.fieldErrors;
  }

  if (error && typeof error === 'object' && 'fieldErrors' in error) {
    const raw = (error as { fieldErrors?: unknown }).fieldErrors;
    if (raw && typeof raw === 'object') {
      return raw as ApiFieldErrorsMap;
    }
  }

  return undefined;
}

export function resolveFieldErrors(fieldErrors?: ApiFieldErrorsMap): Record<string, string> {
  if (!fieldErrors) {
    return {};
  }

  const resolved: Record<string, string> = {};
  for (const [field, issue] of Object.entries(fieldErrors)) {
    if (issue.code in enUSTranslations.validation) {
      resolved[field] = i18n.t(`validation.${issue.code}`, {
        ...issue.params,
        message: issue.message,
      });
    } else {
      resolved[field] = issue.message;
    }
  }

  return resolved;
}

export function resolveNotificationMessage(
  code: NotificationCode,
  params?: ApiErrorParams,
): ToastTranslationEntry {
  const interpolationParams = params ?? {};
  return {
    title: i18n.t(`notifications.${code}.title`, interpolationParams),
    description: i18n.t(`notifications.${code}.description`, interpolationParams),
  };
}

export { i18n };
