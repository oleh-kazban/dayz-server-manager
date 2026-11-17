import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

import {
  type ApiErrorCode,
  type ApiErrorParams,
  type ApiFieldErrorsMap,
  createServerSchema,
  DEFAULT_LAUNCH_OPTIONS,
  isServerActiveStatus,
  SERVER_STATUS,
  serverDetailSchema,
  serverIdParamSchema,
  serverSummarySchema,
  type UpdateServerDto,
  updateServerSchema,
  type ValidateServerPathsRequestDto,
  validateServerPathsRequestSchema,
} from '@aegis/api-contracts';
import { type Server, servers } from '@aegis/database';
import {
  analyzeServerConfig,
  DEFAULT_MAX_PLAYERS,
  extractProjection,
  readIntegerSetting,
} from '@aegis/dayz-config';

import {
  battlEyeConfigService,
  type BattlEyeSyncLogger,
} from '../services/server/battleye-config.service';
import { ConfigStorageError } from '../services/server/config-atomic-writer';
import {
  areLaunchOptionsEqual,
  readLaunchOptions,
} from '../services/server/launch-command.service';
import {
  type DecodedConfigFile,
  readServerDzConfig,
  resolveInstallRoot,
} from '../services/server/server-dz-config.service';
import {
  findFirstValidMissionTemplate,
  serverFsInspectorService,
} from '../services/server/server-fs-inspector.service';
import {
  toServerLastExit,
  toServerPendingStop,
  toServerRuntime,
} from '../services/server/server-lifecycle.service';
import {
  decryptServerSecrets,
  resolveEncryptedServerSecrets,
} from '../services/server/server-secrets';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

const PORT_FIELD_KEYS = ['gamePort', 'queryPort', 'rconPort'] as const;

const LOCKED_CONFIG_KEYS = [
  'name',
  'installPath',
  'missionPath',
  'gamePort',
  'rconPort',
  'rconIp',
] as const;

const DEFAULT_PROFILE_PATH = 'profiles';
const DEFAULT_MISSION_PATH = 'mpmissions/dayzOffline.chernarusplus';
const MIN_QUERY_PORT = 27016;
const MAX_QUERY_PORT = 65535;

interface DiskCreationDefaults {
  explicitQueryPort: number | null;
  maxPlayers: number | null;
  missionTemplate: string | null;
  discoveredMissionPath: string | null;
}

interface ServerConflictCandidate {
  name?: string;
  gamePort: number;
  queryPort: number;
  rconPort: number;
}

interface AggregatedServerConflict {
  errorCode: ApiErrorCode;
  message: string;
  params: ApiErrorParams;
  fieldErrors: ApiFieldErrorsMap;
}

function findPortCollisionIssue(
  targetServers: Server[],
  port: number,
): { message: string; params: ApiErrorParams } | null {
  for (const s of targetServers) {
    if (s.gamePort === port || s.queryPort === port || s.rconPort === port) {
      return {
        message: `Port ${port} collides with existing server '${s.name}' (ID: ${s.id})`,
        params: {
          port,
          occupiedBy: s.name,
          occupiedById: s.id,
        },
      };
    }
  }
  return null;
}

function findServerFieldConflicts(
  allServers: Server[],
  candidate: ServerConflictCandidate,
  excludeServerId?: string,
): AggregatedServerConflict | null {
  const targetServers = excludeServerId
    ? allServers.filter(s => s.id !== excludeServerId)
    : allServers;

  const fieldErrors: ApiFieldErrorsMap = {};
  let primaryConflict: {
    errorCode: ApiErrorCode;
    message: string;
    params: ApiErrorParams;
  } | null = null;

  if (candidate.name !== undefined && targetServers.some(s => s.name === candidate.name)) {
    const message = `Server with name '${candidate.name}' already exists`;
    const params: ApiErrorParams = { name: candidate.name };
    fieldErrors.name = {
      code: 'SERVER_NAME_CONFLICT',
      message,
      params,
    };
    primaryConflict = {
      errorCode: 'SERVER_NAME_CONFLICT',
      message,
      params,
    };
  }

  for (const portKey of PORT_FIELD_KEYS) {
    const collision = findPortCollisionIssue(targetServers, candidate[portKey]);
    if (collision) {
      fieldErrors[portKey] = {
        code: 'SERVER_PORT_COLLISION',
        message: collision.message,
        params: collision.params,
      };
      if (!primaryConflict) {
        primaryConflict = {
          errorCode: 'SERVER_PORT_COLLISION',
          message: collision.message,
          params: collision.params,
        };
      }
    }
  }

  if (!primaryConflict) {
    return null;
  }

  return {
    ...primaryConflict,
    fieldErrors,
  };
}

function sendConflictError(reply: FastifyReply, conflict: AggregatedServerConflict): void {
  sendApiError(reply, 409, conflict.errorCode, {
    message: conflict.message,
    params: conflict.params,
    fieldErrors: conflict.fieldErrors,
  });
}

const EMPTY_DISK_DEFAULTS: DiskCreationDefaults = {
  explicitQueryPort: null,
  maxPlayers: null,
  missionTemplate: null,
  discoveredMissionPath: null,
};

/**
 * Best-effort read of an existing installation so a new server adopts its serverDZ.cfg values.
 * Any unsafe or unreadable path simply yields no defaults; creation itself never fails here.
 */
function readDiskCreationDefaults(installPath: string): DiskCreationDefaults {
  const platform = process.platform;
  let installReal: string;
  try {
    installReal = resolveInstallRoot(installPath, platform);
  } catch (err) {
    if (err instanceof ConfigStorageError) {
      return EMPTY_DISK_DEFAULTS;
    }
    throw err;
  }

  const firstMission = findFirstValidMissionTemplate(installReal, platform);
  const discoveredMissionPath = firstMission ? `mpmissions/${firstMission}` : null;

  let config: DecodedConfigFile | null;
  try {
    config = readServerDzConfig(installReal, platform);
  } catch (err) {
    if (!(err instanceof ConfigStorageError)) {
      throw err;
    }
    config = null;
  }
  if (!config) {
    return { ...EMPTY_DISK_DEFAULTS, discoveredMissionPath };
  }

  const { document } = analyzeServerConfig(config.lf);
  const projection = extractProjection(document);
  return {
    explicitQueryPort: readIntegerSetting(document.entries, 'steamQueryPort'),
    maxPlayers: projection.maxPlayers,
    missionTemplate: projection.missionTemplate,
    discoveredMissionPath,
  };
}

function pickAvailableQueryPort(allServers: Server[], requestedPorts: number[]): number | null {
  const occupied = new Set<number>(requestedPorts);
  for (const server of allServers) {
    occupied.add(server.gamePort);
    occupied.add(server.queryPort);
    occupied.add(server.rconPort);
  }
  for (let port = MIN_QUERY_PORT; port <= MAX_QUERY_PORT; port += 1) {
    if (!occupied.has(port)) {
      return port;
    }
  }
  return null;
}

function resolveCreationPortConflict(
  allServers: Server[],
  candidate: Omit<ServerConflictCandidate, 'queryPort'> & { queryPort: number | null },
  diskQuerySelfCollides: boolean,
): AggregatedServerConflict | null {
  const dbConflict = findServerFieldConflicts(allServers, {
    name: candidate.name,
    gamePort: candidate.gamePort,
    queryPort: candidate.queryPort ?? -1,
    rconPort: candidate.rconPort,
  });

  if (candidate.queryPort !== null && !diskQuerySelfCollides) {
    return dbConflict;
  }

  const queryPortMessage =
    candidate.queryPort === null
      ? `No available Steam query port in range ${MIN_QUERY_PORT}-${MAX_QUERY_PORT}`
      : `Port ${candidate.queryPort} from serverDZ.cfg collides with requested gamePort or rconPort`;
  const queryPortParams: ApiErrorParams =
    candidate.queryPort === null ? {} : { port: candidate.queryPort };
  const fieldErrors: ApiFieldErrorsMap = {
    ...(dbConflict?.fieldErrors ?? {}),
    queryPort: {
      code: 'SERVER_PORT_COLLISION',
      message: queryPortMessage,
      params: queryPortParams,
    },
  };

  if (dbConflict) {
    return { ...dbConflict, fieldErrors };
  }

  return {
    errorCode: 'SERVER_PORT_COLLISION',
    message: queryPortMessage,
    params: queryPortParams,
    fieldErrors,
  };
}

function checkRunningMutationViolation(existing: Server, data: UpdateServerDto): boolean {
  if (!isServerActiveStatus(existing.status)) {
    return false;
  }

  if (data.rconPassword !== undefined) {
    return true;
  }

  if (
    data.launchOptions !== undefined &&
    !areLaunchOptionsEqual(data.launchOptions, readLaunchOptions(existing))
  ) {
    return true;
  }

  return LOCKED_CONFIG_KEYS.some(key => data[key] !== undefined && data[key] !== existing[key]);
}

function tryBestEffortBattlEyeSync(saved: Server, logger: BattlEyeSyncLogger): void {
  if (isServerActiveStatus(saved.status)) {
    return;
  }

  const decrypted = decryptServerSecrets(saved);
  if (!decrypted.ok) {
    logger.warn(
      { serverId: saved.id, errorCode: decrypted.errorCode, message: decrypted.message },
      'Skipped BattlEye config auto-sync because credentials could not be decrypted',
    );
    return;
  }

  battlEyeConfigService.tryAutoSyncOnSave(saved, decrypted.secrets.rconPassword, { logger });
}

function hasRconSettingsChanged(existing: Server, data: UpdateServerDto): boolean {
  return (
    data.rconPassword !== undefined ||
    (data.rconPort !== undefined && data.rconPort !== existing.rconPort) ||
    (data.rconIp !== undefined && data.rconIp !== existing.rconIp)
  );
}

export function sendServerDetail(reply: FastifyReply, s: Server, statusCode: 200 | 201 = 200) {
  const decrypted = decryptServerSecrets(s);
  if (!decrypted.ok) {
    return sendApiError(reply, 500, decrypted.errorCode, decrypted.message);
  }

  return reply.status(statusCode).send(
    serverDetailSchema.parse({
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      gamePort: s.gamePort,
      queryPort: s.queryPort,
      rconPort: s.rconPort,
      rconIp: s.rconIp,
      maxPlayers: s.maxPlayers,
      rconPassword: decrypted.secrets.rconPassword,
      isDefault: s.isDefault,
      installPath: s.installPath,
      profilePath: s.profilePath,
      missionPath: s.missionPath,
      launchOptions: readLaunchOptions(s),
      runtime: toServerRuntime(s),
      pendingStop: toServerPendingStop(s),
      lastExit: toServerLastExit(s),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }),
  );
}

function sendSavedServer(
  fastify: FastifyInstance,
  reply: FastifyReply,
  serverId: string,
  options: { statusCode: 200 | 201; syncBattlEye: boolean; logger: BattlEyeSyncLogger },
) {
  const saved = fastify.db.select().from(servers).where(eq(servers.id, serverId)).get();
  if (!saved) {
    return sendApiError(
      reply,
      500,
      'INTERNAL_SERVER_ERROR',
      'Server record could not be read back after saving.',
    );
  }
  if (options.syncBattlEye) {
    tryBestEffortBattlEyeSync(saved, options.logger);
  }
  return sendServerDetail(reply, saved, options.statusCode);
}

export function resolveServerByIdOrSendError(
  fastify: FastifyInstance,
  params: unknown,
  reply: FastifyReply,
): Server | null {
  const paramResult = serverIdParamSchema.safeParse(params);
  if (!paramResult.success) {
    sendApiError(reply, 400, 'VALIDATION_FAILED', {
      message: paramResult.error.issues[0].message,
      fieldErrors: formatZodFieldErrors(paramResult.error),
    });
    return null;
  }

  const { id } = paramResult.data;
  const server = fastify.db.select().from(servers).where(eq(servers.id, id)).get();

  if (!server) {
    sendApiError(reply, 404, 'SERVER_NOT_FOUND', {
      message: `Server with ID '${id}' not found`,
      params: { id },
    });
    return null;
  }

  return server;
}

export function ensureAdminRole(
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

export const registerServersRoutes: FastifyPluginAsync = async fastify => {
  // GET /api/v1/servers - List all servers
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (_request, reply) => {
      const rows = fastify.db.select().from(servers).all();

      const summaries = rows.map(s =>
        serverSummarySchema.parse({
          id: s.id,
          name: s.name,
          description: s.description,
          status: s.status,
          gamePort: s.gamePort,
          queryPort: s.queryPort,
          rconPort: s.rconPort,
          isDefault: s.isDefault,
          lastExit: toServerLastExit(s),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        }),
      );

      return reply.send(summaries);
    },
  );

  // GET /api/v1/servers/:id - Get server detail
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const s = resolveServerByIdOrSendError(fastify, request.params, reply);
      if (!s) {
        return;
      }

      return sendServerDetail(reply, s);
    },
  );

  // POST /api/v1/servers - Create new server
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to create servers')) {
        return;
      }

      const parseResult = createServerSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const data = parseResult.data;
      const disk = readDiskCreationDefaults(data.installPath);

      const secretOutcome = resolveEncryptedServerSecrets(
        { rconPassword: data.rconPassword },
        { rconPasswordEncrypted: null, rconPasswordLegacy: null },
      );
      if (!secretOutcome.ok) {
        return sendApiError(reply, 500, secretOutcome.errorCode, secretOutcome.message);
      }

      const serverId = crypto.randomUUID();
      const now = new Date();
      const profilePath = data.profilePath ?? DEFAULT_PROFILE_PATH;
      const diskMissionPath = disk.missionTemplate ? `mpmissions/${disk.missionTemplate}` : null;
      const missionPath =
        data.missionPath ?? diskMissionPath ?? disk.discoveredMissionPath ?? DEFAULT_MISSION_PATH;
      const maxPlayers = data.maxPlayers ?? disk.maxPlayers ?? DEFAULT_MAX_PLAYERS;

      const createTransaction = fastify.sqlite.transaction(() => {
        const allServers = fastify.db.select().from(servers).all();
        const candidateQueryPort =
          data.queryPort ??
          disk.explicitQueryPort ??
          pickAvailableQueryPort(allServers, [data.gamePort, data.rconPort]);
        const diskQuerySelfCollides =
          data.queryPort === undefined &&
          disk.explicitQueryPort !== null &&
          (disk.explicitQueryPort === data.gamePort || disk.explicitQueryPort === data.rconPort);

        const conflict = resolveCreationPortConflict(
          allServers,
          {
            name: data.name,
            gamePort: data.gamePort,
            queryPort: candidateQueryPort,
            rconPort: data.rconPort,
          },
          diskQuerySelfCollides,
        );
        if (conflict) {
          return { ok: false as const, conflict };
        }
        if (candidateQueryPort === null) {
          throw new Error('Expected non-null queryPort when conflict check passes');
        }

        if (data.isDefault) {
          fastify.db.update(servers).set({ isDefault: false }).run();
        }

        fastify.db
          .insert(servers)
          .values({
            id: serverId,
            name: data.name,
            description: data.description ?? null,
            status: SERVER_STATUS.STOPPED,
            installPath: data.installPath,
            profilePath,
            missionPath,
            gamePort: data.gamePort,
            queryPort: candidateQueryPort,
            rconPort: data.rconPort,
            rconIp: data.rconIp,
            maxPlayers,
            rconPassword: secretOutcome.rconPassword,
            rconPasswordEncrypted: secretOutcome.rconPasswordEncrypted,
            launchOptions: data.launchOptions ?? DEFAULT_LAUNCH_OPTIONS,
            isDefault: data.isDefault ?? false,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        return { ok: true as const };
      });

      const outcome = createTransaction.immediate();
      if (!outcome.ok) {
        return sendConflictError(reply, outcome.conflict);
      }

      return sendSavedServer(fastify, reply, serverId, {
        statusCode: 201,
        logger: request.log,
        syncBattlEye: Boolean(data.rconPassword),
      });
    },
  );

  // PATCH /api/v1/servers/:id - Update server
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to update servers')) {
        return;
      }

      const existing = resolveServerByIdOrSendError(fastify, request.params, reply);
      if (!existing) {
        return;
      }
      const { id } = existing;

      const parseResult = updateServerSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: parseResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(parseResult.error),
        });
      }

      const data: UpdateServerDto = parseResult.data;

      // GUARD-SRV-03: Running Configuration Mutation Guard
      if (checkRunningMutationViolation(existing, data)) {
        return sendApiError(reply, 409, 'SERVER_RUNNING_CONFIG_LOCKED', {
          message: `Cannot alter server configuration while "${existing.name}" is ${existing.status}.`,
          params: { id: existing.id, name: existing.name, status: existing.status },
        });
      }

      const candidateGamePort = data.gamePort ?? existing.gamePort;
      const candidateQueryPort = existing.queryPort;
      const candidateRconPort = data.rconPort ?? existing.rconPort;

      if (new Set([candidateGamePort, candidateQueryPort, candidateRconPort]).size !== 3) {
        const message = 'Effective gamePort, queryPort, and rconPort must all be distinct';
        return sendApiError(reply, 400, 'SERVER_PORTS_NOT_DISTINCT', {
          message,
          fieldErrors: {
            gamePort: {
              code: 'PORTS_NOT_DISTINCT',
              message,
            },
          },
        });
      }

      const secretOutcome = resolveEncryptedServerSecrets(
        {
          rconPassword: data.rconPassword,
        },
        {
          rconPasswordEncrypted: existing.rconPasswordEncrypted,
          rconPasswordLegacy: existing.rconPassword,
        },
      );
      if (!secretOutcome.ok) {
        return sendApiError(reply, 500, secretOutcome.errorCode, secretOutcome.message);
      }

      const updateTransaction = fastify.sqlite.transaction(() => {
        const allServers = fastify.db.select().from(servers).all();
        const conflict = findServerFieldConflicts(
          allServers,
          {
            name: data.name && data.name !== existing.name ? data.name : undefined,
            gamePort: candidateGamePort,
            queryPort: candidateQueryPort,
            rconPort: candidateRconPort,
          },
          id,
        );
        if (conflict) {
          return { ok: false as const, conflict };
        }

        if (data.isDefault) {
          fastify.db.update(servers).set({ isDefault: false }).run();
        }

        fastify.db
          .update(servers)
          .set({
            name: data.name ?? existing.name,
            description: data.description !== undefined ? data.description : existing.description,
            installPath: data.installPath ?? existing.installPath,
            missionPath: data.missionPath ?? existing.missionPath,
            gamePort: candidateGamePort,
            rconPort: candidateRconPort,
            rconIp: data.rconIp ?? existing.rconIp,
            rconPassword: secretOutcome.rconPassword,
            rconPasswordEncrypted: secretOutcome.rconPasswordEncrypted,
            launchOptions: data.launchOptions ?? readLaunchOptions(existing),
            isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
            updatedAt: new Date(),
          })
          .where(eq(servers.id, id))
          .run();

        return { ok: true as const };
      });

      const outcome = updateTransaction.immediate();
      if (!outcome.ok) {
        return sendConflictError(reply, outcome.conflict);
      }

      return sendSavedServer(fastify, reply, id, {
        statusCode: 200,
        logger: request.log,
        syncBattlEye: hasRconSettingsChanged(existing, data),
      });
    },
  );

  // DELETE /api/v1/servers/:id - Delete server
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (!ensureAdminRole(request, reply, 'Admin role required to delete servers')) {
        return;
      }

      const existing = resolveServerByIdOrSendError(fastify, request.params, reply);
      if (!existing) {
        return;
      }
      const { id } = existing;

      // GUARD-SRV-01: Active Process Termination Guard
      if (isServerActiveStatus(existing.status)) {
        return sendApiError(reply, 409, 'SERVER_RUNNING_DELETE_LOCKED', {
          message: 'Cannot delete server while it is running. Stop the server first.',
          params: { id: existing.id, name: existing.name, status: existing.status },
        });
      }

      const executeDelete = fastify.sqlite.transaction(() => {
        fastify.db.delete(servers).where(eq(servers.id, id)).run();

        if (existing.isDefault) {
          const remaining = fastify.db
            .select()
            .from(servers)
            .orderBy(asc(servers.createdAt))
            .limit(1)
            .all();

          if (remaining.length > 0) {
            fastify.db
              .update(servers)
              .set({ isDefault: true })
              .where(eq(servers.id, remaining[0].id))
              .run();
          }
        }
      });

      executeDelete();

      return reply.send({ success: true });
    },
  );

  // POST /api/v1/servers/:id/validate-paths - Non-mutating filesystem validation & mission discovery
  fastify.post<{ Params: { id: string } }>(
    '/:id/validate-paths',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      if (
        !ensureAdminRole(request, reply, 'Admin role required to validate server filesystem paths')
      ) {
        return;
      }

      const existing = resolveServerByIdOrSendError(fastify, request.params, reply);
      if (!existing) {
        return;
      }

      let overrides: ValidateServerPathsRequestDto = {};
      if (request.body !== undefined) {
        const parseResult = validateServerPathsRequestSchema.safeParse(request.body);
        if (!parseResult.success) {
          return sendApiError(reply, 400, 'VALIDATION_FAILED', {
            message: parseResult.error.issues[0].message,
            fieldErrors: formatZodFieldErrors(parseResult.error),
          });
        }
        overrides = parseResult.data;
      }

      const result = serverFsInspectorService.inspect({
        serverId: existing.id,
        installPath: overrides.installPath ?? existing.installPath,
        profilePath: overrides.profilePath ?? DEFAULT_PROFILE_PATH,
        missionPath: overrides.missionPath ?? existing.missionPath,
      });

      return reply.send(result);
    },
  );
};
