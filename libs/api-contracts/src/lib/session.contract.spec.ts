import { describe, expect, it } from 'vitest';

import {
  revokeOthersResponseSchema,
  sessionDtoSchema,
  sessionListResponseSchema,
} from './session.contract';

describe('Session Contracts', () => {
  describe('sessionDtoSchema', () => {
    it('validates a complete active session DTO', () => {
      const valid = {
        id: 'sess-1234-uuid',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '127.0.0.1',
        deviceSummary: 'Chrome on Windows',
        lastActiveAt: '2026-11-07T14:40:00.000Z',
        createdAt: '2026-11-07T12:00:00.000Z',
        expiresAt: '2026-11-14T12:00:00.000Z',
        isCurrent: true,
      };

      const result = sessionDtoSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deviceSummary).toBe('Chrome on Windows');
        expect(result.data.isCurrent).toBe(true);
      }
    });

    it('allows null and optional values for userAgent and ipAddress', () => {
      const minimal = {
        id: 'sess-min',
        userAgent: null,
        ipAddress: null,
        deviceSummary: 'Unknown Device',
        lastActiveAt: '2026-11-07T14:40:00.000Z',
        createdAt: '2026-11-07T12:00:00.000Z',
        expiresAt: '2026-11-14T12:00:00.000Z',
        isCurrent: false,
      };

      const result = sessionDtoSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('rejects missing required attributes', () => {
      const missing = {
        id: 'sess-bad',
        deviceSummary: 'Chrome on Windows',
      };

      const result = sessionDtoSchema.safeParse(missing);
      expect(result.success).toBe(false);
    });
  });

  describe('sessionListResponseSchema', () => {
    it('validates a list of session DTOs with total count', () => {
      const payload = {
        sessions: [
          {
            id: 'sess-1',
            userAgent: 'Chrome',
            ipAddress: '127.0.0.1',
            deviceSummary: 'Chrome on Windows',
            lastActiveAt: '2026-11-07T14:40:00.000Z',
            createdAt: '2026-11-07T12:00:00.000Z',
            expiresAt: '2026-11-14T12:00:00.000Z',
            isCurrent: true,
          },
        ],
        totalCount: 1,
      };

      const result = sessionListResponseSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessions).toHaveLength(1);
        expect(result.data.totalCount).toBe(1);
      }
    });

    it('rejects negative totalCount', () => {
      const result = sessionListResponseSchema.safeParse({
        sessions: [],
        totalCount: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('revokeOthersResponseSchema', () => {
    it('validates bulk revocation response', () => {
      const payload = {
        revokedCount: 2,
        message: 'Successfully revoked 2 other active sessions.',
      };

      const result = revokeOthersResponseSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.revokedCount).toBe(2);
      }
    });

    it('rejects negative revokedCount', () => {
      const result = revokeOthersResponseSchema.safeParse({
        revokedCount: -5,
        message: 'Failed',
      });
      expect(result.success).toBe(false);
    });
  });
});
