import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { steamSettingsSchema } from '@aegis/api-contracts';
import {
  type DatabaseInstance,
  decryptVaultSecret,
  initDatabase,
  resolveVaultKey,
  steamSettings,
} from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { steamPathService } from '../services/steam/steam-path.service';
import { steamRunnerService } from '../services/steam/steam-runner.service';

describe('Steam Routes (/api/v1/settings/steam)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    dbInstance = initDatabase({ dbPath: ':memory:' });
    const config = loadEnv({
      SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
      LOG_LEVEL: 'silent',
    });

    app = buildApp({
      config,
      db: dbInstance,
    });

    await app.ready();

    adminToken = app.jwt.sign(
      { sub: 'admin-id', role: 'admin', type: 'access' },
      { expiresIn: '15m' },
    );
    viewerToken = app.jwt.sign(
      { sub: 'viewer-id', role: 'viewer', type: 'access' },
      { expiresIn: '15m' },
    );

    // Normalize timestamp for test database baseline
    const now = new Date();
    dbInstance.db
      .update(steamSettings)
      .set({ createdAt: now, updatedAt: now })
      .where(eq(steamSettings.id, 'default'))
      .run();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  describe('RBAC & Authentication Boundaries', () => {
    it('returns 401 Unauthorized when no auth token is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/steam',
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 Forbidden when accessed by non-admin role (viewer)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/steam',
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body.errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
    });

    it('returns 403 Forbidden when non-admin attempts PATCH', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/steam',
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: { branch: 'experimental' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/v1/settings/steam (REQ-01, ARCH-01)', () => {
    it('returns current settings without exposing plaintext passwords', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/settings/steam',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const parsed = steamSettingsSchema.parse(body);

      expect(parsed.id).toBe('default');
      expect(parsed.authMode).toBe('anonymous');
      expect(parsed.gameServerAppId).toBe(223350);
      expect(parsed.workshopAppId).toBe(221100);
      expect(parsed.branch).toBe('public');
      expect(parsed.hasPassword).toBe(false);
      expect(body).not.toHaveProperty('steamPassword');
      expect(body).not.toHaveProperty('steamPasswordEncrypted');
      expect(body).not.toHaveProperty('branchPasswordEncrypted');
    });
  });

  describe('PATCH /api/v1/settings/steam (REQ-01, REQ-02, REQ-03, GUARD-01, GUARD-03)', () => {
    it('updates valid settings, encrypts password in database, and returns masked state', async () => {
      vi.spyOn(steamPathService, 'validateSteamCmdPath').mockReturnValue({ valid: true });
      vi.spyOn(steamPathService, 'validateStoragePath').mockReturnValue({ valid: true });

      const payload = {
        authMode: 'account' as const,
        steamUsername: 'dayz_operator_42',
        steamPassword: 'VaultPassword2026!',
        gameServerAppId: 1042420,
        workshopAppId: 221100,
        branch: 'experimental',
        branchPassword: 'BranchSecretPass!',
      };

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/steam',
        headers: { authorization: `Bearer ${adminToken}` },
        payload,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.authMode).toBe('account');
      expect(body.steamUsername).toBe('dayz_operator_42');
      expect(body.gameServerAppId).toBe(1042420);
      expect(body.branch).toBe('experimental');
      expect(body.hasPassword).toBe(true);
      expect(body.hasBranchPassword).toBe(true);

      // Verify AES-256-GCM encryption in database at rest (ARCH-01)
      const row = dbInstance.db
        .select()
        .from(steamSettings)
        .where(eq(steamSettings.id, 'default'))
        .get();

      expect(row).toBeDefined();
      expect(row!.steamPasswordEncrypted).toContain(':');
      expect(row!.steamPasswordEncrypted).not.toBe('VaultPassword2026!');
      expect(row!.branchPasswordEncrypted).toContain(':');

      const vaultKey = resolveVaultKey();
      const decryptedSteam = decryptVaultSecret(row!.steamPasswordEncrypted!, vaultKey);
      expect(decryptedSteam).toBe('VaultPassword2026!');

      const decryptedBranch = decryptVaultSecret(row!.branchPasswordEncrypted!, vaultKey);
      expect(decryptedBranch).toBe('BranchSecretPass!');
    });

    it('preserves existing password when omitted in update (REQ-03)', async () => {
      vi.spyOn(steamPathService, 'validateSteamCmdPath').mockReturnValue({ valid: true });
      vi.spyOn(steamPathService, 'validateStoragePath').mockReturnValue({ valid: true });

      const rowBefore = dbInstance.db
        .select()
        .from(steamSettings)
        .where(eq(steamSettings.id, 'default'))
        .get()!;

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/steam',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          branch: 'custom-branch',
        },
      });

      expect(res.statusCode).toBe(200);
      const rowAfter = dbInstance.db
        .select()
        .from(steamSettings)
        .where(eq(steamSettings.id, 'default'))
        .get()!;

      expect(rowAfter.branch).toBe('custom-branch');
      expect(rowAfter.steamPasswordEncrypted).toBe(rowBefore.steamPasswordEncrypted);
    });

    it('refuses update when account mode is selected without a username (REQ-03)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/steam',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          authMode: 'account',
          steamUsername: '',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.errorCode).toBe('STEAM_USERNAME_REQUIRED');
    });

    it('refuses update with INVALID_STEAMCMD_PATH and mutates zero rows (GUARD-01)', async () => {
      vi.spyOn(steamPathService, 'validateSteamCmdPath').mockReturnValue({
        valid: false,
        errorCode: 'INVALID_STEAMCMD_PATH',
        message: 'Binary does not exist',
      });

      const rowBefore = dbInstance.db
        .select()
        .from(steamSettings)
        .where(eq(steamSettings.id, 'default'))
        .get()!;

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/steam',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          steamCmdPath:
            process.platform === 'win32'
              ? 'C:\\nonexistent\\steamcmd.exe'
              : '/nonexistent/steamcmd',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.errorCode).toBe('INVALID_STEAMCMD_PATH');

      // Guarantee zero mutations
      const rowAfter = dbInstance.db
        .select()
        .from(steamSettings)
        .where(eq(steamSettings.id, 'default'))
        .get()!;

      expect(rowAfter.updatedAt.getTime()).toBe(rowBefore.updatedAt.getTime());
    });

    it('refuses update with STORAGE_PATH_NOT_WRITABLE for unwritable workshop path (GUARD-01)', async () => {
      vi.spyOn(steamPathService, 'validateStoragePath').mockReturnValue({
        valid: false,
        errorCode: 'STORAGE_PATH_NOT_WRITABLE',
        message: 'No write access',
      });

      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/settings/steam',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          steamWorkshopPath:
            process.platform === 'win32' ? 'D:\\read_only\\workshop' : '/mnt/ro/workshop',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.errorCode).toBe('STORAGE_PATH_NOT_WRITABLE');
    });
  });

  describe('POST /api/v1/settings/steam/session/clear (REQ-04)', () => {
    it('clears session tokens and updates sessionStatus to UNAUTHENTICATED', async () => {
      const clearSpy = vi.spyOn(steamRunnerService, 'clearSessionTokens').mockReturnValue({
        success: true,
        clearedCount: 3,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/session/clear',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(clearSpy).toHaveBeenCalled();

      const row = dbInstance.db
        .select()
        .from(steamSettings)
        .where(eq(steamSettings.id, 'default'))
        .get()!;
      expect(row.sessionStatus).toBe('UNAUTHENTICATED');
    });

    it('returns 409 SESSION_CLEAR_FAILED if filesystem locks prevent clearing', async () => {
      vi.spyOn(steamRunnerService, 'clearSessionTokens').mockImplementation(() => {
        const error = new Error('EBUSY: resource locked');
        (error as unknown as { errorCode: string }).errorCode = 'SESSION_CLEAR_FAILED';
        throw error;
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/session/clear',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.errorCode).toBe('SESSION_CLEAR_FAILED');
    });
  });

  describe('POST /api/v1/settings/steam/session/login', () => {
    it('returns 400 STEAM_USERNAME_REQUIRED if authMode is not account', async () => {
      dbInstance.db
        .update(steamSettings)
        .set({ authMode: 'anonymous' })
        .where(eq(steamSettings.id, 'default'))
        .run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/session/login',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().errorCode).toBe('STEAM_USERNAME_REQUIRED');
    });

    it('returns 400 VALIDATION_FAILED if password is not saved', async () => {
      dbInstance.db
        .update(steamSettings)
        .set({ authMode: 'account', steamUsername: 'admin_user', steamPasswordEncrypted: null })
        .where(eq(steamSettings.id, 'default'))
        .run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/session/login',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().errorCode).toBe('VALIDATION_FAILED');
    });

    it('successfully spawns authenticated login workflow', async () => {
      dbInstance.db
        .update(steamSettings)
        .set({
          authMode: 'account',
          steamUsername: 'admin_user',
          steamPasswordEncrypted: 'mock-encrypted-password',
        })
        .where(eq(steamSettings.id, 'default'))
        .run();

      const spawnSpy = vi
        .spyOn(steamRunnerService, 'spawnAuthenticatedLogin')
        .mockResolvedValue(undefined);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/session/login',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(spawnSpy).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/settings/steam/challenge/respond (REQ-06, GUARD-02)', () => {
    it('rejects invalid OTP code format with 400 VALIDATION_FAILED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/challenge/respond',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
          code: 'lowercase',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.errorCode).toBe('VALIDATION_FAILED');
    });

    it('returns 404 CHALLENGE_NOT_FOUND_OR_EXPIRED if challenge is unknown', async () => {
      vi.spyOn(steamRunnerService, 'submitChallengeOtp').mockImplementation(() => {
        const err = new Error('Not found');
        (err as unknown as { errorCode: string }).errorCode = 'CHALLENGE_NOT_FOUND_OR_EXPIRED';
        throw err;
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/challenge/respond',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
          code: '8K9B2',
        },
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.errorCode).toBe('CHALLENGE_NOT_FOUND_OR_EXPIRED');
    });

    it('returns 409 CHALLENGE_PROCESS_INVALID if child process has exited (GUARD-02)', async () => {
      vi.spyOn(steamRunnerService, 'submitChallengeOtp').mockImplementation(() => {
        const err = new Error('Process exited');
        (err as unknown as { errorCode: string }).errorCode = 'CHALLENGE_PROCESS_INVALID';
        throw err;
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/challenge/respond',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
          code: '8K9B2',
        },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.errorCode).toBe('CHALLENGE_PROCESS_INVALID');
    });

    it('successfully submits valid 2FA response', async () => {
      const submitSpy = vi
        .spyOn(steamRunnerService, 'submitChallengeOtp')
        .mockReturnValue(undefined);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/challenge/respond',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
          code: '8K9B2',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(submitSpy).toHaveBeenCalledWith('c8273645-1234-4567-89ab-cdef01234567', '8K9B2');
    });
  });

  describe('POST /api/v1/settings/steam/challenge/abort (REQ-06)', () => {
    it('successfully aborts active challenge', async () => {
      const abortSpy = vi.spyOn(steamRunnerService, 'abortChallenge').mockReturnValue(undefined);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/challenge/abort',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          challengeId: 'c8273645-1234-4567-89ab-cdef01234567',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(abortSpy).toHaveBeenCalledWith('c8273645-1234-4567-89ab-cdef01234567');
    });
  });

  describe('POST /api/v1/settings/steam/diagnostics (REQ-07)', () => {
    it('executes diagnostics runner and returns probe metrics', async () => {
      vi.spyOn(steamRunnerService, 'runDiagnostics').mockResolvedValue({
        success: true,
        steamCmdValid: true,
        steamCmdVersion: '1730000000',
        workshopPathWritable: true,
        workshopFreeBytes: 150000000000,
        metaPathWritable: true,
        metaFreeBytes: 80000000000,
        connectionSuccess: true,
        latencyMs: 95,
        logs: ['Probe started', 'Probe finished'],
        timestamp: new Date().toISOString(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/diagnostics',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.latencyMs).toBe(95);
      expect(body.logs).toHaveLength(2);
    });

    it('returns 409 TASK_CONCURRENCY_CONFLICT if runner is busy', async () => {
      vi.spyOn(steamRunnerService, 'runDiagnostics').mockImplementation(() => {
        const error = new Error('Task in progress');
        (error as unknown as { errorCode: string }).errorCode = 'TASK_CONCURRENCY_CONFLICT';
        throw error;
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/settings/steam/diagnostics',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.errorCode).toBe('TASK_CONCURRENCY_CONFLICT');
    });
  });
});
