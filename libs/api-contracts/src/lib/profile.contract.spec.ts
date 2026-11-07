import { describe, expect, it } from 'vitest';

import {
  changePasswordResponseSchema,
  changePasswordSchema,
  updateProfileSchema,
  userProfileSchema,
} from './profile.contract';

describe('Profile Contracts', () => {
  describe('userProfileSchema', () => {
    it('validates a complete user profile DTO', () => {
      const valid = {
        id: 'usr-1234',
        username: 'operator',
        displayName: 'Operator Zero',
        email: 'operator@dayz.local',
        role: 'admin',
        timezone: 'Europe/Berlin',
        timeFormat: '24h',
        createdAt: '2026-11-01T12:00:00.000Z',
        lastLoginAt: '2026-11-07T10:00:00.000Z',
      };

      const result = userProfileSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('operator');
        expect(result.data.timezone).toBe('Europe/Berlin');
      }
    });

    it('applies default UTC and 24h when timezone and timeFormat are omitted', () => {
      const minimal = {
        id: 'usr-min',
        username: 'operator',
        role: 'viewer',
        createdAt: '2026-11-01T12:00:00.000Z',
      };

      const result = userProfileSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timezone).toBe('UTC');
        expect(result.data.timeFormat).toBe('24h');
      }
    });

    it('allows null and optional values for displayName, email, and lastLoginAt', () => {
      const withNulls = {
        id: 'usr-nulls',
        username: 'operator',
        displayName: null,
        email: null,
        role: 'moderator',
        createdAt: '2026-11-01T12:00:00.000Z',
        lastLoginAt: null,
      };

      const result = userProfileSchema.safeParse(withNulls);
      expect(result.success).toBe(true);
    });

    it('rejects invalid role or invalid datetime string', () => {
      const invalid = {
        id: 'usr-bad',
        username: 'operator',
        role: 'superadmin',
        createdAt: 'not-a-datetime',
      };

      const result = userProfileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('accepts valid profile update payload', () => {
      const payload = {
        displayName: 'Callsign Ranger',
        email: 'ranger@dayz.local',
        timezone: 'America/New_York',
        timeFormat: '12h' as const,
      };

      const result = updateProfileSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts empty string and null for email', () => {
      expect(updateProfileSchema.safeParse({ email: '' }).success).toBe(true);
      expect(updateProfileSchema.safeParse({ email: null }).success).toBe(true);
    });

    it('rejects displayName exceeding 50 characters', () => {
      const result = updateProfileSchema.safeParse({
        displayName: 'A'.repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email address', () => {
      const result = updateProfileSchema.safeParse({
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid timeFormat enum value', () => {
      const result = updateProfileSchema.safeParse({
        timeFormat: '48h',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('validates matching new passwords', () => {
      const valid = {
        currentPassword: 'currentPassword1!',
        newPassword: 'brandNewPassword2@',
        confirmPassword: 'brandNewPassword2@',
      };

      const result = changePasswordSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('normalizes confirmNewPassword alias via preprocessing', () => {
      const withAlias = {
        currentPassword: 'currentPassword1!',
        newPassword: 'brandNewPassword2@',
        confirmNewPassword: 'brandNewPassword2@',
      };

      const result = changePasswordSchema.safeParse(withAlias);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confirmPassword).toBe('brandNewPassword2@');
      }
    });

    it('handles non-object raw value in preprocessor gracefully', () => {
      expect(changePasswordSchema.safeParse(null).success).toBe(false);
      expect(changePasswordSchema.safeParse('string').success).toBe(false);
    });

    it('rejects mismatched newPassword and confirmPassword with refinement path', () => {
      const mismatch = {
        currentPassword: 'currentPassword1!',
        newPassword: 'brandNewPassword2@',
        confirmPassword: 'differentPassword3#',
      };

      const result = changePasswordSchema.safeParse(mismatch);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.issues.find(i => i.path.includes('confirmPassword'));
        expect(error).toBeDefined();
        expect(error?.message).toBe('Passwords do not match');
      }
    });

    it('rejects new password shorter than 8 characters', () => {
      const short = {
        currentPassword: 'currentPassword1!',
        newPassword: 'short',
        confirmPassword: 'short',
      };

      const result = changePasswordSchema.safeParse(short);
      expect(result.success).toBe(false);
    });

    it('rejects empty current password', () => {
      const emptyCurrent = {
        currentPassword: '',
        newPassword: 'brandNewPassword2@',
        confirmPassword: 'brandNewPassword2@',
      };

      const result = changePasswordSchema.safeParse(emptyCurrent);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordResponseSchema', () => {
    it('validates successful password rotation response', () => {
      const payload = {
        success: true,
        message: 'Password rotated successfully and other sessions invalidated.',
      };

      const result = changePasswordResponseSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});
