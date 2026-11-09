import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import {
  type ApiErrorCode,
  steamChallengeAbortSchema,
  steamChallengeResponseSchema,
  type SteamDiagnosticsResultDto,
  type SteamSettingsDto,
  steamSettingsSchema,
  type StorageStats,
  type UpdateSteamSettingsDto,
  updateSteamSettingsSchema,
} from '@aegis/api-contracts';
import {
  encryptVaultSecret,
  resolveVaultKey,
  type SteamSettings,
  steamSettings,
  verifyVaultKey,
} from '@aegis/database';

import { steamPathService } from '../services/steam/steam-path.service';
import {
  steamRunnerService,
  type SteamSessionStatusType,
} from '../services/steam/steam-runner.service';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

function ensureAdminRole(
  request: FastifyRequest,
  reply: FastifyReply,
  actionMessage: string,
): boolean {
  if (request.user?.role !== 'admin') {
    sendApiError(reply, 403, 'AUTH_FORBIDDEN_ADMIN_REQUIRED', actionMessage);
    return false;
  }
  return true;
}

function toSafeIsoDate(date: Date): string {
  if (date.getFullYear() > 9999) {
    return new Date(Math.floor(date.getTime() / 1000)).toISOString();
  }
  return date.toISOString();
}

function mapSteamSettingsDetail(row: SteamSettings, storageStats?: StorageStats): SteamSettingsDto {
  return steamSettingsSchema.parse({
    id: row.id,
    steamCmdPath: row.steamCmdPath,
    steamWorkshopPath: row.steamWorkshopPath,
    steamMetaPath: row.steamMetaPath,
    authMode: row.authMode,
    steamUsername: row.steamUsername,
    hasPassword: Boolean(row.steamPasswordEncrypted),
    gameServerAppId: row.gameServerAppId,
    workshopAppId: row.workshopAppId,
    branch: row.branch,
    hasBranchPassword: Boolean(row.branchPasswordEncrypted),
    sessionStatus: row.sessionStatus,
    storageStats,
    createdAt: toSafeIsoDate(row.createdAt),
    updatedAt: toSafeIsoDate(row.updatedAt),
  });
}

function getOrCreateDefaultSettings(fastify: FastifyInstance): SteamSettings {
  let record = fastify.db.select().from(steamSettings).where(eq(steamSettings.id, 'default')).get();
  if (!record) {
    const now = new Date();
    const defaultCmd =
      process.platform === 'win32' ? 'C:\\steamcmd\\steamcmd.exe' : '/usr/games/steamcmd';
    const defaultWorkshop =
      process.platform === 'win32' ? 'C:\\DayZServer\\steamapps\\workshop' : '/var/dayz/workshop';
    const defaultMeta =
      process.platform === 'win32' ? 'C:\\DayZServer\\steamapps' : '/var/dayz/steamapps';

    fastify.db
      .insert(steamSettings)
      .values({
        id: 'default',
        steamCmdPath: defaultCmd,
        steamWorkshopPath: defaultWorkshop,
        steamMetaPath: defaultMeta,
        authMode: 'anonymous',
        gameServerAppId: 223350,
        workshopAppId: 221100,
        branch: 'public',
        sessionStatus: 'UNAUTHENTICATED',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    record = fastify.db.select().from(steamSettings).where(eq(steamSettings.id, 'default')).get()!;
  }
  return record;
}

function validatePathPreconditions(data: UpdateSteamSettingsDto, reply: FastifyReply): boolean {
  if (data.steamCmdPath !== undefined) {
    const cmdCheck = steamPathService.validateSteamCmdPath(data.steamCmdPath);
    if (!cmdCheck.valid) {
      sendApiError(reply, 400, cmdCheck.errorCode ?? 'INVALID_STEAMCMD_PATH', {
        message: cmdCheck.message ?? 'Invalid SteamCMD binary path',
      });
      return false;
    }
  }

  if (data.steamWorkshopPath !== undefined) {
    const workshopCheck = steamPathService.validateStoragePath(data.steamWorkshopPath);
    if (!workshopCheck.valid) {
      sendApiError(reply, 400, workshopCheck.errorCode ?? 'STORAGE_PATH_NOT_WRITABLE', {
        message: workshopCheck.message ?? 'Invalid Workshop path',
      });
      return false;
    }
  }

  if (data.steamMetaPath !== undefined) {
    const metaCheck = steamPathService.validateStoragePath(data.steamMetaPath);
    if (!metaCheck.valid) {
      sendApiError(reply, 400, metaCheck.errorCode ?? 'STORAGE_PATH_NOT_WRITABLE', {
        message: metaCheck.message ?? 'Invalid SteamCMD metadata path',
      });
      return false;
    }
  }

  return true;
}

interface EncryptionResult {
  success: boolean;
  newSteamPassword?: string | null;
  newBranchPassword?: string | null;
  errorCode?: ApiErrorCode;
  errorMessage?: string;
  statusCode?: number;
}

function encryptField(
  plaintext: string | undefined | null,
  vaultKey: Buffer,
): { encrypted: string | null; error?: never } | { encrypted?: never; error: string } {
  if (plaintext === undefined || plaintext === '' || plaintext === null) {
    return { encrypted: null };
  }
  try {
    return { encrypted: encryptVaultSecret(plaintext, vaultKey) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

function resolveEncryptionSecrets(
  data: UpdateSteamSettingsDto,
  current: SteamSettings,
): EncryptionResult {
  if (data.steamPassword === undefined && data.branchPassword === undefined) {
    return {
      success: true,
      newSteamPassword: current.steamPasswordEncrypted,
      newBranchPassword: current.branchPasswordEncrypted,
    };
  }

  const vaultKey = resolveVaultKey();
  if (!verifyVaultKey(vaultKey)) {
    return {
      success: false,
      statusCode: 500,
      errorCode: 'VAULT_KEY_UNAVAILABLE',
      errorMessage: 'Encryption vault key is unavailable or failed verification vector.',
    };
  }

  let newSteamPassword = current.steamPasswordEncrypted;
  if (data.steamPassword !== undefined && data.steamPassword !== '') {
    const res = encryptField(data.steamPassword, vaultKey);
    if (res.error) {
      return {
        success: false,
        statusCode: 500,
        errorCode: 'VAULT_ENCRYPTION_FAILED',
        errorMessage: `Failed to encrypt Steam credentials: ${res.error}`,
      };
    }
    newSteamPassword = res.encrypted ?? null;
  }

  let newBranchPassword = current.branchPasswordEncrypted;
  if (data.branchPassword !== undefined) {
    const res = encryptField(data.branchPassword, vaultKey);
    if (res.error) {
      return {
        success: false,
        statusCode: 500,
        errorCode: 'VAULT_ENCRYPTION_FAILED',
        errorMessage: `Failed to encrypt branch password: ${res.error}`,
      };
    }
    newBranchPassword = res.encrypted ?? null;
  }

  return {
    success: true,
    newSteamPassword,
    newBranchPassword,
  };
}

export const registerSteamRoutes: FastifyPluginAsync = async fastify => {
  // GET /api/v1/settings/steam
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to view Steam settings')) {
        return;
      }

      const settings = getOrCreateDefaultSettings(fastify);
      const workshopCapacity = steamPathService.getVolumeCapacity(settings.steamWorkshopPath);
      const metaCapacity = steamPathService.getVolumeCapacity(settings.steamMetaPath);
      const storageStats: StorageStats = {
        workshop: workshopCapacity ?? undefined,
        meta: metaCapacity ?? undefined,
      };

      return reply.send(mapSteamSettingsDetail(settings, storageStats));
    },
  );

  // PATCH /api/v1/settings/steam
  fastify.patch(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to update Steam settings')) {
        return;
      }

      const parseResult = updateSteamSettingsSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const data = parseResult.data;
      const current = getOrCreateDefaultSettings(fastify);

      if (!validatePathPreconditions(data, reply)) {
        return;
      }

      const effectiveMode = data.authMode ?? current.authMode;
      const effectiveUsername =
        data.steamUsername !== undefined ? data.steamUsername : current.steamUsername;

      if (effectiveMode === 'account' && (!effectiveUsername || effectiveUsername.trim() === '')) {
        return sendApiError(reply, 400, 'STEAM_USERNAME_REQUIRED', {
          message:
            'Steam account username is required when account authentication mode is selected.',
        });
      }

      const encryption = resolveEncryptionSecrets(data, current);
      if (!encryption.success) {
        return sendApiError(
          reply,
          encryption.statusCode ?? 500,
          encryption.errorCode ?? 'VAULT_ENCRYPTION_FAILED',
          { message: encryption.errorMessage ?? 'Encryption failed' },
        );
      }

      fastify.db
        .update(steamSettings)
        .set({
          steamCmdPath: data.steamCmdPath ?? current.steamCmdPath,
          steamWorkshopPath: data.steamWorkshopPath ?? current.steamWorkshopPath,
          steamMetaPath: data.steamMetaPath ?? current.steamMetaPath,
          authMode: effectiveMode,
          steamUsername: effectiveUsername ?? null,
          steamPasswordEncrypted: encryption.newSteamPassword,
          gameServerAppId: data.gameServerAppId ?? current.gameServerAppId,
          workshopAppId: data.workshopAppId ?? current.workshopAppId,
          branch: data.branch ?? current.branch,
          branchPasswordEncrypted: encryption.newBranchPassword,
          updatedAt: new Date(),
        })
        .where(eq(steamSettings.id, 'default'))
        .run();

      const updated = getOrCreateDefaultSettings(fastify);
      const workshopCapacity = steamPathService.getVolumeCapacity(updated.steamWorkshopPath);
      const metaCapacity = steamPathService.getVolumeCapacity(updated.steamMetaPath);
      const storageStats: StorageStats = {
        workshop: workshopCapacity ?? undefined,
        meta: metaCapacity ?? undefined,
      };

      return reply.send(mapSteamSettingsDetail(updated, storageStats));
    },
  );

  // POST /api/v1/settings/steam/session/clear
  fastify.post(
    '/session/clear',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to clear session tokens')) {
        return;
      }

      const current = getOrCreateDefaultSettings(fastify);
      try {
        steamRunnerService.clearSessionTokens(current.steamMetaPath);
      } catch (err) {
        return sendApiError(reply, 409, 'SESSION_CLEAR_FAILED', {
          message: (err as Error).message,
        });
      }

      fastify.db
        .update(steamSettings)
        .set({
          sessionStatus: 'UNAUTHENTICATED',
          updatedAt: new Date(),
        })
        .where(eq(steamSettings.id, 'default'))
        .run();

      fastify.sseHub.broadcast('steam.auth.status', { status: 'UNAUTHENTICATED' });

      return reply.send({ success: true, message: 'Session tokens cleared successfully.' });
    },
  );

  // POST /api/v1/settings/steam/session/login
  fastify.post(
    '/session/login',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to authenticate Steam session')) {
        return;
      }

      const current = getOrCreateDefaultSettings(fastify);
      if (current.authMode !== 'account' || !current.steamUsername) {
        return sendApiError(reply, 400, 'STEAM_USERNAME_REQUIRED', {
          message:
            'Dedicated Steam account mode and username are required to initiate authentication.',
        });
      }

      if (!current.steamPasswordEncrypted) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message:
            'No Steam account password stored in vault. Save credentials before authenticating.',
        });
      }

      const vaultKey = resolveVaultKey();
      try {
        await steamRunnerService.spawnAuthenticatedLogin(current, vaultKey, status => {
          fastify.db
            .update(steamSettings)
            .set({
              sessionStatus: status,
              updatedAt: new Date(),
            })
            .where(eq(steamSettings.id, 'default'))
            .run();
        });

        return reply.send({ success: true, message: 'Authentication process initiated.' });
      } catch (err: unknown) {
        const error = err as { errorCode?: ApiErrorCode; message?: string };
        if (error.errorCode === 'TASK_CONCURRENCY_CONFLICT') {
          return sendApiError(reply, 409, 'TASK_CONCURRENCY_CONFLICT', {
            message: error.message ?? 'Another Steam task is already in progress.',
          });
        }
        return sendApiError(reply, 500, 'INTERNAL_SERVER_ERROR', {
          message: (err as Error).message,
        });
      }
    },
  );

  // POST /api/v1/settings/steam/challenge/respond
  fastify.post(
    '/challenge/respond',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to respond to 2FA challenge')) {
        return;
      }

      const parseResult = steamChallengeResponseSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { challengeId, code } = parseResult.data;

      try {
        steamRunnerService.submitChallengeOtp(challengeId, code);
      } catch (err: unknown) {
        const error = err as { errorCode?: ApiErrorCode; message?: string };
        const errorCode = error.errorCode ?? 'CHALLENGE_PROCESS_INVALID';
        const status = errorCode === 'CHALLENGE_NOT_FOUND_OR_EXPIRED' ? 404 : 409;
        return sendApiError(reply, status, errorCode, {
          message: error.message ?? 'Failed to submit challenge OTP',
        });
      }

      return reply.send({ success: true, message: 'Challenge response submitted.' });
    },
  );

  // POST /api/v1/settings/steam/challenge/abort
  fastify.post(
    '/challenge/abort',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to abort challenge')) {
        return;
      }

      const parseResult = steamChallengeAbortSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const { challengeId } = parseResult.data;

      try {
        steamRunnerService.abortChallenge(challengeId);
      } catch (err: unknown) {
        const error = err as { errorCode?: ApiErrorCode; message?: string };
        const errorCode = error.errorCode ?? 'CHALLENGE_NOT_FOUND_OR_EXPIRED';
        return sendApiError(reply, 404, errorCode, {
          message: error.message ?? 'Failed to abort challenge',
        });
      }

      return reply.send({ success: true, message: 'Challenge aborted.' });
    },
  );

  // POST /api/v1/settings/steam/diagnostics
  fastify.post(
    '/diagnostics',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to run Steam diagnostics')) {
        return;
      }

      const current = getOrCreateDefaultSettings(fastify);
      const vaultKey = resolveVaultKey();

      try {
        const onStatusChange = (status: SteamSessionStatusType) => {
          fastify.db
            .update(steamSettings)
            .set({ sessionStatus: status, updatedAt: new Date() })
            .where(eq(steamSettings.id, 'default'))
            .run();
        };

        const result: SteamDiagnosticsResultDto = await steamRunnerService.runDiagnostics(
          current,
          vaultKey,
          onStatusChange,
        );

        if (result.connectionSuccess && current.authMode === 'account') {
          fastify.db
            .update(steamSettings)
            .set({
              sessionStatus: 'AUTHENTICATED',
              updatedAt: new Date(),
            })
            .where(eq(steamSettings.id, 'default'))
            .run();
          fastify.sseHub.broadcast('steam.auth.status', { status: 'AUTHENTICATED' });
        }

        return reply.send(result);
      } catch (err: unknown) {
        const error = err as { errorCode?: ApiErrorCode; message?: string };
        if (error.errorCode === 'TASK_CONCURRENCY_CONFLICT') {
          return sendApiError(reply, 409, 'TASK_CONCURRENCY_CONFLICT', {
            message: error.message ?? 'Task conflict',
          });
        }
        return sendApiError(reply, 500, 'INTERNAL_SERVER_ERROR', {
          message: (err as Error).message,
        });
      }
    },
  );
};
