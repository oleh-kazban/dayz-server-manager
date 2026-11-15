import { describe, expect, it } from 'vitest';

import {
  apiErrorCodeSchema,
  apiErrorParamsSchema,
  apiErrorResponseSchema,
  apiFieldErrorSchema,
  apiFieldErrorsMapSchema,
} from './error.contract';

describe('Error Contracts (@aegis/api-contracts)', () => {
  describe('apiErrorCodeSchema', () => {
    it.each(apiErrorCodeSchema.options)('accepts canonical error code %s', code => {
      const parsed = apiErrorCodeSchema.safeParse(code);
      expect(parsed.success).toBe(true);
    });

    it('includes server config storage and BattlEye sync error codes', () => {
      expect(apiErrorCodeSchema.options).toEqual(
        expect.arrayContaining([
          'CONFIG_PATH_INVALID',
          'CONFIG_WRITE_FAILED',
          'CONFIG_BACKUP_FAILED',
          'CONFIG_RCON_PASSWORD_REQUIRED',
        ]),
      );
    });

    it.each([
      'CONFIG_EDIT_LOCKED',
      'CONFIG_LOCK_NOT_HELD',
      'CONFIG_HASH_MISMATCH',
      'CONFIG_VALIDATION_FAILED',
      'CONFIG_FILE_TOO_LARGE',
      'CONFIG_FILE_EXISTS',
      'CONFIG_FILE_MISSING',
      'CONFIG_REVISION_NOT_FOUND',
      'SERVER_CONFIG_EDIT_IN_PROGRESS',
    ])('includes serverDZ.cfg editor error code %s in a full error envelope', code => {
      expect(apiErrorCodeSchema.options).toContain(code);
      const parsed = apiErrorResponseSchema.safeParse({
        statusCode: 409,
        error: 'Conflict',
        errorCode: code,
        message: 'Refused',
        params: { holderName: 'admin', expiresInSeconds: 120, heldByYou: false },
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects nested objects in error params so lock holder details stay flat', () => {
      expect(apiErrorParamsSchema.safeParse({ holder: { name: 'admin' } }).success).toBe(false);
    });

    it('rejects unrecognized error codes and non-string values', () => {
      expect(apiErrorCodeSchema.safeParse('UNKNOWN_CODE').success).toBe(false);
      expect(apiErrorCodeSchema.safeParse('').success).toBe(false);
      expect(apiErrorCodeSchema.safeParse(404).success).toBe(false);
    });
  });

  describe('apiErrorParamsSchema', () => {
    it('accepts primitive string, number, and boolean values', () => {
      const parsed = apiErrorParamsSchema.safeParse({
        port: 2302,
        occupiedBy: 'DayZ Namalsk',
        isLocked: true,
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects nested objects, arrays, and null values', () => {
      expect(apiErrorParamsSchema.safeParse({ nested: { key: 'val' } }).success).toBe(false);
      expect(apiErrorParamsSchema.safeParse({ list: [1, 2] }).success).toBe(false);
      expect(apiErrorParamsSchema.safeParse({ empty: null }).success).toBe(false);
    });
  });

  describe('apiFieldErrorSchema and apiFieldErrorsMapSchema', () => {
    it('validates structured field error maps with optional interpolation params', () => {
      const parsed = apiFieldErrorsMapSchema.safeParse({
        name: {
          code: 'REQUIRED',
          message: 'Server name is required',
        },
        gamePort: {
          code: 'NUMBER_TOO_SMALL',
          message: 'Port must be >= 1024',
          params: { min: 1024 },
        },
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects field error entries with empty code or message', () => {
      expect(apiFieldErrorSchema.safeParse({ code: '', message: 'Valid message' }).success).toBe(
        false,
      );
      expect(apiFieldErrorSchema.safeParse({ code: 'REQUIRED', message: '' }).success).toBe(false);
    });
  });

  describe('apiErrorResponseSchema', () => {
    it('validates a full structured error response with params and fieldErrors', () => {
      const payload = {
        statusCode: 400,
        error: 'Bad Request',
        errorCode: 'VALIDATION_FAILED',
        message: 'Invalid request payload',
        params: { count: 2 },
        fieldErrors: {
          installPath: {
            code: 'PATH_TRAVERSAL_FORBIDDEN',
            message: 'Path traversal (..) is not permitted',
          },
        },
      };

      const parsed = apiErrorResponseSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('validates a conflict error response with interpolation params', () => {
      const payload = {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'SERVER_PORT_COLLISION',
        message: "Port 2302 collides with existing server 'DayZ Local'",
        params: {
          port: 2302,
          occupiedBy: 'DayZ Local',
          occupiedById: '11111111-1111-4111-a111-111111111111',
        },
      };

      const parsed = apiErrorResponseSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('rejects error response when errorCode is missing or invalid', () => {
      expect(
        apiErrorResponseSchema.safeParse({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Missing errorCode',
        }).success,
      ).toBe(false);

      expect(
        apiErrorResponseSchema.safeParse({
          statusCode: 401,
          error: 'Unauthorized',
          errorCode: 'NOT_A_VALID_CODE',
          message: 'Invalid errorCode',
        }).success,
      ).toBe(false);
    });
  });
});
