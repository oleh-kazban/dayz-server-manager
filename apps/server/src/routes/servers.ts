import { asc, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

import {
  type ApiErrorCode,
  type ApiErrorParams,
  type ApiFieldErrorsMap,
  type CreateServerDto,
  createServerSchema,
  isServerActiveStatus,
  SERVER_STATUS,
  serverDetailSchema,
  serverIdParamSchema,
  serverSummarySchema,
  type UpdateServerDto,
  updateServerSchema,
} from '@dsm/api-contracts';
import { type Server, servers } from '@dsm/database';

import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

const PORT_FIELD_KEYS = ['gamePort', 'queryPort', 'rconPort'] as const;

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

function sendIfServerFieldConflicts(
  fastify: FastifyInstance,
  reply: FastifyReply,
  candidate: ServerConflictCandidate,
  excludeServerId?: string,
): boolean {
  const allServers = fastify.db.select().from(servers).all();
  const conflict = findServerFieldConflicts(allServers, candidate, excludeServerId);
  if (!conflict) {
    return false;
  }

  sendApiError(reply, 409, conflict.errorCode, {
    message: conflict.message,
    params: conflict.params,
    fieldErrors: conflict.fieldErrors,
  });
  return true;
}

function checkRunningMutationViolation(existing: Server, data: UpdateServerDto): boolean {
  if (!isServerActiveStatus(existing.status)) {
    return false;
  }

  const portChanged =
    (data.gamePort !== undefined && data.gamePort !== existing.gamePort) ||
    (data.queryPort !== undefined && data.queryPort !== existing.queryPort) ||
    (data.rconPort !== undefined && data.rconPort !== existing.rconPort);

  const pathChanged =
    (data.installPath !== undefined && data.installPath !== existing.installPath) ||
    (data.profilePath !== undefined && data.profilePath !== existing.profilePath);

  return portChanged || pathChanged;
}

function mapServerDetail(s: Server) {
  return serverDetailSchema.parse({
    id: s.id,
    name: s.name,
    description: s.description,
    status: s.status,
    gamePort: s.gamePort,
    queryPort: s.queryPort,
    rconPort: s.rconPort,
    isDefault: s.isDefault,
    installPath: s.installPath,
    profilePath: s.profilePath,
    missionPath: s.missionPath,
    launchParameters: s.launchParameters,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  });
}

function resolveServerByIdOrSendError(
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

      return reply.send(mapServerDetail(s));
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

      const data: CreateServerDto = parseResult.data;

      if (
        sendIfServerFieldConflicts(fastify, reply, {
          name: data.name,
          gamePort: data.gamePort,
          queryPort: data.queryPort,
          rconPort: data.rconPort,
        })
      ) {
        return;
      }

      const serverId = crypto.randomUUID();
      const now = new Date();

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
          profilePath: data.profilePath,
          missionPath: data.missionPath,
          gamePort: data.gamePort,
          queryPort: data.queryPort,
          rconPort: data.rconPort,
          rconPassword: data.rconPassword ?? null,
          launchParameters: data.launchParameters ?? null,
          isDefault: data.isDefault ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const created = fastify.db.select().from(servers).where(eq(servers.id, serverId)).get();

      return reply.status(201).send(mapServerDetail(created!));
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
          message: 'Cannot alter network ports or filesystem paths while server is running.',
          params: { id: existing.id, name: existing.name, status: existing.status },
        });
      }

      const candidateGamePort = data.gamePort ?? existing.gamePort;
      const candidateQueryPort = data.queryPort ?? existing.queryPort;
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

      if (
        sendIfServerFieldConflicts(
          fastify,
          reply,
          {
            name: data.name && data.name !== existing.name ? data.name : undefined,
            gamePort: candidateGamePort,
            queryPort: candidateQueryPort,
            rconPort: candidateRconPort,
          },
          id,
        )
      ) {
        return;
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
          profilePath: data.profilePath ?? existing.profilePath,
          missionPath: data.missionPath ?? existing.missionPath,
          gamePort: candidateGamePort,
          queryPort: candidateQueryPort,
          rconPort: candidateRconPort,
          rconPassword: data.rconPassword !== undefined ? data.rconPassword : existing.rconPassword,
          launchParameters:
            data.launchParameters !== undefined ? data.launchParameters : existing.launchParameters,
          isDefault: data.isDefault !== undefined ? data.isDefault : existing.isDefault,
          updatedAt: new Date(),
        })
        .where(eq(servers.id, id))
        .run();

      const updated = fastify.db.select().from(servers).where(eq(servers.id, id)).get();

      return reply.send(mapServerDetail(updated!));
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
};
