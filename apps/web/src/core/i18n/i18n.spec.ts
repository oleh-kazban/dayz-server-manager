import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@dsm/api-client';
import { apiErrorCodeSchema } from '@dsm/api-contracts';
import { showToast } from '@dsm/ui';

import { notifyApiError, notifySuccess } from '../notifications';

import {
  enUSTranslations,
  resolveApiErrorMessage,
  resolveFieldErrors,
  resolveNotificationMessage,
} from './index';

vi.mock('@dsm/ui', async importOriginal => {
  const actual = await importOriginal<typeof import('@dsm/ui')>();
  return {
    ...actual,
    showToast: {
      ...actual.showToast,
      success: vi.fn(() => 'toast-success-id'),
      error: vi.fn(() => 'toast-error-id'),
    },
  };
});

describe('i18n Error & Notification Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Boundary Contract Drift Guard', () => {
    it.each(apiErrorCodeSchema.options)(
      'maps ApiErrorCode "%s" to a non-empty en-US title and description',
      code => {
        const entry = enUSTranslations.errors[code];
        expect(entry).toBeDefined();
        expect(entry.title.trim().length).toBeGreaterThan(0);
        expect(entry.description.trim().length).toBeGreaterThan(0);
      },
    );
  });

  describe('resolveApiErrorMessage', () => {
    it('interpolates parameters for known ApiErrorCode', () => {
      const err = new ApiError('Port collision', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'SERVER_PORT_COLLISION',
        message: 'Port 2302 collides',
        params: {
          port: 2302,
          occupiedBy: 'DayZ Chernarus',
          occupiedById: 'srv-1',
        },
      });

      const resolved = resolveApiErrorMessage(err);
      expect(resolved).toEqual({
        title: 'Port Collision Detected',
        description: 'Port 2302 is already in use by server "DayZ Chernarus".',
      });
    });

    it('interpolates server name and status for running lock errors', () => {
      const err = new ApiError('Locked', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'SERVER_RUNNING_DELETE_LOCKED',
        message: 'Locked',
        params: {
          id: 'srv-1',
          name: 'Namalsk Hardcore',
          status: 'running',
        },
      });

      const resolved = resolveApiErrorMessage(err);
      expect(resolved).toEqual({
        title: 'Deletion Locked',
        description: 'Cannot delete "Namalsk Hardcore" while it is running. Stop the server first.',
      });
    });

    it('falls back to apiMessage when errorCode is absent or unrecognized (GUARD-01)', () => {
      const err = new ApiError('HTTP 400', 400, {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Custom backend fallback message',
      });

      const resolved = resolveApiErrorMessage(err, 'Save Failed');
      expect(resolved).toEqual({
        title: 'Save Failed',
        description: 'Custom backend fallback message',
      });
    });

    it('falls back to Error.message for standard Error instances and default copy for non-Error values', () => {
      expect(resolveApiErrorMessage(new Error('Network timeout'), 'Request Error')).toEqual({
        title: 'Request Error',
        description: 'Network timeout',
      });

      expect(resolveApiErrorMessage(null, 'Fallback Title', 'Fallback Description')).toEqual({
        title: 'Fallback Title',
        description: 'Fallback Description',
      });
    });
  });

  describe('resolveFieldErrors', () => {
    it('translates known validation issue codes with parameter interpolation and preserves unknown codes', () => {
      const fieldErrors = resolveFieldErrors({
        name: { code: 'REQUIRED', message: 'Name is required' },
        rconPassword: {
          code: 'STRING_TOO_SHORT',
          message: 'Too short',
          params: { min: 6 },
        },
        gamePort: {
          code: 'NUMBER_TOO_SMALL',
          message: 'Too small',
          params: { min: 1024 },
        },
        installPath: {
          code: 'PATH_TRAVERSAL_FORBIDDEN',
          message: 'Traversal',
        },
        customField: {
          code: 'UNKNOWN_CUSTOM_CODE',
          message: 'Raw server validation message',
        },
      });

      expect(fieldErrors).toEqual({
        name: 'This field is required.',
        rconPassword: 'Must be at least 6 characters.',
        gamePort: 'Port must be between 1024 and 65535.',
        installPath: 'Path traversal (..) is not permitted.',
        customField: 'Raw server validation message',
      });
    });

    it('returns an empty object when fieldErrors is undefined', () => {
      expect(resolveFieldErrors(undefined)).toEqual({});
    });
  });

  describe('resolveNotificationMessage, notifySuccess, and notifyApiError', () => {
    it('resolves CRUD notification messages and invokes showToast.success', () => {
      expect(resolveNotificationMessage('SERVER_CREATED', { name: 'Livonia 1PP' })).toEqual({
        title: 'Server Created',
        description: 'Server "Livonia 1PP" has been created successfully.',
      });

      const id = notifySuccess('SERVER_UPDATED', { name: 'Deer Isle' }, 4000);
      expect(id).toBe('toast-success-id');
      expect(showToast.success).toHaveBeenCalledWith(
        'Settings Saved',
        'Configuration for "Deer Isle" has been updated successfully.',
        4000,
      );
    });

    it('resolves ApiError and invokes showToast.error via notifyApiError', () => {
      const err = new ApiError('Conflict', 409, {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'SERVER_NAME_CONFLICT',
        message: 'Exists',
        params: { name: 'Chernarus Vanilla' },
      });

      const id = notifyApiError(err, 'Create Failed');
      expect(id).toBe('toast-error-id');
      expect(showToast.error).toHaveBeenCalledWith(
        'Server Name Conflict',
        'A server named "Chernarus Vanilla" already exists. Please choose a unique name.',
        undefined,
      );
    });
  });
});
