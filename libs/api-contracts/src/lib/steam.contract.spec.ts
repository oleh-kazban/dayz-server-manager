import { describe, expect, it } from 'vitest';

import {
  STEAM_APP_IDS,
  steamAuthModeSchema,
  steamChallengeAbortSchema,
  steamChallengeEventSchema,
  steamChallengeResponseSchema,
  steamChallengeTypeSchema,
  steamDiagnosticsResultSchema,
  steamSessionStatusSchema,
  steamSettingsSchema,
  updateSteamSettingsSchema,
} from './steam.contract';

describe('Steam Contracts (libs/api-contracts)', () => {
  describe('Constants & Enums', () => {
    it('defines canonical Steam App IDs for DayZ server ecosystem', () => {
      expect(STEAM_APP_IDS.DAYZ_SERVER_STABLE).toBe(223350);
      expect(STEAM_APP_IDS.DAYZ_SERVER_EXPERIMENTAL).toBe(1042420);
      expect(STEAM_APP_IDS.DAYZ_WORKSHOP).toBe(221100);
    });

    it('validates auth modes and rejects arbitrary strings', () => {
      expect(steamAuthModeSchema.parse('anonymous')).toBe('anonymous');
      expect(steamAuthModeSchema.parse('account')).toBe('account');
      expect(() => steamAuthModeSchema.parse('oauth')).toThrow();
      expect(() => steamAuthModeSchema.parse('')).toThrow();
    });

    it('validates session statuses and rejects invalid enum members', () => {
      expect(steamSessionStatusSchema.parse('UNAUTHENTICATED')).toBe('UNAUTHENTICATED');
      expect(steamSessionStatusSchema.parse('AUTHENTICATED')).toBe('AUTHENTICATED');
      expect(steamSessionStatusSchema.parse('CHALLENGE_REQUIRED')).toBe('CHALLENGE_REQUIRED');
      expect(steamSessionStatusSchema.parse('EXPIRED')).toBe('EXPIRED');
      expect(() => steamSessionStatusSchema.parse('PENDING')).toThrow();
    });

    it('validates challenge types (OTP_CODE vs MOBILE_PUSH)', () => {
      expect(steamChallengeTypeSchema.parse('OTP_CODE')).toBe('OTP_CODE');
      expect(steamChallengeTypeSchema.parse('MOBILE_PUSH')).toBe('MOBILE_PUSH');
      expect(() => steamChallengeTypeSchema.parse('EMAIL')).toThrow();
    });
  });

  describe('steamSettingsSchema', () => {
    const validSettings = {
      id: 'default',
      steamCmdPath: 'C:\\steamcmd\\steamcmd.exe',
      steamWorkshopPath: 'C:\\DayZServer\\steamapps\\workshop',
      steamMetaPath: 'C:\\DayZServer\\steamapps',
      authMode: 'anonymous' as const,
      steamUsername: null,
      hasPassword: false,
      gameServerAppId: 223350,
      workshopAppId: 221100,
      branch: 'public',
      hasBranchPassword: false,
      sessionStatus: 'UNAUTHENTICATED' as const,
      createdAt: '2026-11-09T18:00:00.000Z',
      updatedAt: '2026-11-09T18:00:00.000Z',
    };

    it('parses a valid Steam settings DTO', () => {
      const parsed = steamSettingsSchema.parse(validSettings);
      expect(parsed.id).toBe('default');
      expect(parsed.gameServerAppId).toBe(223350);
      expect(parsed.workshopAppId).toBe(221100);
      expect(parsed.hasPassword).toBe(false);
    });

    it('accepts valid POSIX absolute paths for steam paths', () => {
      const posixSettings = {
        ...validSettings,
        steamCmdPath: '/usr/games/steamcmd',
        steamWorkshopPath: '/var/dayz/workshop',
        steamMetaPath: '/var/dayz/steamapps',
      };
      const parsed = steamSettingsSchema.parse(posixSettings);
      expect(parsed.steamCmdPath).toBe('/usr/games/steamcmd');
    });

    it('rejects paths with directory traversal sequences (GUARD-01)', () => {
      expect(() =>
        steamSettingsSchema.parse({
          ...validSettings,
          steamCmdPath: 'C:\\steamcmd\\..\\secret\\cmd.exe',
        }),
      ).toThrow();

      expect(() =>
        steamSettingsSchema.parse({
          ...validSettings,
          steamWorkshopPath: '/var/dayz/../../etc',
        }),
      ).toThrow();
    });

    it('rejects paths containing null bytes', () => {
      expect(() =>
        steamSettingsSchema.parse({
          ...validSettings,
          steamCmdPath: 'C:\\steamcmd\\bin\0evil.exe',
        }),
      ).toThrow();
    });

    it('rejects non-positive and non-integer App IDs (REQ-02)', () => {
      expect(() =>
        steamSettingsSchema.parse({
          ...validSettings,
          gameServerAppId: 0,
        }),
      ).toThrow();

      expect(() =>
        steamSettingsSchema.parse({
          ...validSettings,
          gameServerAppId: -223350,
        }),
      ).toThrow();

      expect(() =>
        steamSettingsSchema.parse({
          ...validSettings,
          workshopAppId: 221100.5,
        }),
      ).toThrow();
    });

    it('rejects branch names containing shell metacharacters or whitespace (REQ-02)', () => {
      const invalidBranches = [
        'branch with spaces',
        'branch;rm -rf /',
        'branch`echo evil`',
        'branch$VAR',
        'branch&evil',
        'branch|evil',
      ];

      for (const branch of invalidBranches) {
        expect(() =>
          steamSettingsSchema.parse({
            ...validSettings,
            branch,
          }),
        ).toThrow();
      }
    });

    it('accepts valid alphanumeric, dot, underscore, and hyphen branch names', () => {
      const validBranches = ['public', 'experimental', 'beta_1.24-test', 'dev.build-42'];
      for (const branch of validBranches) {
        const parsed = steamSettingsSchema.parse({
          ...validSettings,
          branch,
        });
        expect(parsed.branch).toBe(branch);
      }
    });
  });

  describe('updateSteamSettingsSchema', () => {
    it('accepts empty object for partial updates', () => {
      const parsed = updateSteamSettingsSchema.parse({});
      expect(parsed).toEqual({});
    });

    it('accepts partial update with dedicated credentials and branch parameters', () => {
      const dto = {
        authMode: 'account' as const,
        steamUsername: 'dayz_operator',
        steamPassword: 'SuperSecretPassword123!',
        branch: 'experimental',
        branchPassword: 'beta-password-99',
      };
      const parsed = updateSteamSettingsSchema.parse(dto);
      expect(parsed.authMode).toBe('account');
      expect(parsed.steamUsername).toBe('dayz_operator');
      expect(parsed.steamPassword).toBe('SuperSecretPassword123!');
      expect(parsed.branchPassword).toBe('beta-password-99');
    });

    it('rejects invalid path format in partial updates (GUARD-01)', () => {
      expect(() =>
        updateSteamSettingsSchema.parse({
          steamWorkshopPath: 'C:\\valid\\..\\traversal\\workshop',
        }),
      ).toThrow();
    });

    it('rejects invalid App ID in partial updates', () => {
      expect(() =>
        updateSteamSettingsSchema.parse({
          workshopAppId: -1,
        }),
      ).toThrow();
    });
  });

  describe('2FA Challenge Schemas (REQ-05, REQ-06)', () => {
    it('parses valid steamChallengeEventSchema with default 90-second timeout', () => {
      const event = {
        challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
        type: 'OTP_CODE' as const,
        createdAt: '2026-11-09T18:30:00.000Z',
      };
      const parsed = steamChallengeEventSchema.parse(event);
      expect(parsed.challengeId).toBe('c8273645-1234-4567-89ab-cdef01234567');
      expect(parsed.timeoutSeconds).toBe(90);
      expect(parsed.type).toBe('OTP_CODE');
    });

    it('rejects challenge event with invalid UUID or non-ISO timestamp', () => {
      expect(() =>
        steamChallengeEventSchema.parse({
          challengeId: 'not-a-uuid',
          type: 'OTP_CODE',
          createdAt: '2026-11-09T18:30:00.000Z',
        }),
      ).toThrow();

      expect(() =>
        steamChallengeEventSchema.parse({
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
          type: 'OTP_CODE',
          createdAt: 'invalid-date',
        }),
      ).toThrow();
    });

    it('steamChallengeResponseSchema enforces exactly 5 uppercase alphanumeric characters (REQ-06)', () => {
      const valid = steamChallengeResponseSchema.parse({
        challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
        code: '8K9B2',
      });
      expect(valid.code).toBe('8K9B2');

      // Lowercase rejected
      expect(() =>
        steamChallengeResponseSchema.parse({
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
          code: '8k9b2',
        }),
      ).toThrow();

      // Too short
      expect(() =>
        steamChallengeResponseSchema.parse({
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
          code: '8K9B',
        }),
      ).toThrow();

      // Too long
      expect(() =>
        steamChallengeResponseSchema.parse({
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
          code: '8K9B2X',
        }),
      ).toThrow();

      // Special characters rejected
      expect(() =>
        steamChallengeResponseSchema.parse({
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
          code: '8K-B2',
        }),
      ).toThrow();
    });

    it('steamChallengeAbortSchema validates challenge UUID', () => {
      const valid = steamChallengeAbortSchema.parse({
        challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
      });
      expect(valid.challengeId).toBe('c8273645-1234-4567-89ab-cdef01234567');

      expect(() =>
        steamChallengeAbortSchema.parse({
          challengeId: 'invalid-id',
        }),
      ).toThrow();
    });
  });

  describe('steamDiagnosticsResultSchema (REQ-07)', () => {
    it('parses complete diagnostic probe payload', () => {
      const diagData = {
        success: true,
        steamCmdValid: true,
        steamCmdVersion: '1730000000',
        workshopPathWritable: true,
        workshopFreeBytes: 150000000000,
        metaPathWritable: true,
        metaFreeBytes: 80000000000,
        connectionSuccess: true,
        latencyMs: 142,
        logs: [
          '[2026-11-09T18:00:00.000Z] SteamCMD binary check: VALID',
          '[2026-11-09T18:00:00.100Z] Logged in OK',
        ],
        timestamp: '2026-11-09T18:00:00.200Z',
      };

      const parsed = steamDiagnosticsResultSchema.parse(diagData);
      expect(parsed.success).toBe(true);
      expect(parsed.latencyMs).toBe(142);
      expect(parsed.logs).toHaveLength(2);
      expect(parsed.workshopFreeBytes).toBe(150000000000);
    });

    it('rejects diagnostics missing required fields', () => {
      expect(() =>
        steamDiagnosticsResultSchema.parse({
          success: true,
          steamCmdValid: true,
        }),
      ).toThrow();
    });
  });
});
