import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodType } from 'zod';

import {
  acquireConfigLockRequestSchema,
  bootstrapServerDzConfigRequestSchema,
  CONFIG_FILE_KIND,
  configLockSessionRequestSchema,
  configRevisionParamSchema,
  getServerDzConfigQuerySchema,
  releaseConfigLockResponseSchema,
  restoreConfigRevisionRequestSchema,
  saveServerDzConfigRequestSchema,
  SERVER_CONFIG_MAX_BYTES,
  serverIdParamSchema,
  validateServerDzConfigRequestSchema,
} from '@aegis/api-contracts';
import { type Server, servers } from '@aegis/database';

import { battlEyeConfigService } from '../services/server/battleye-config.service';
import { ConfigStorageError } from '../services/server/config-atomic-writer';
import { ConfigEditLockService } from '../services/server/config-edit-lock.service';
import { ServerDzConfigService } from '../services/server/server-dz-config.service';
import { decryptServerSecrets } from '../services/server/server-secrets';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

const CONFIG_ROUTE_BODY_LIMIT = SERVER_CONFIG_MAX_BYTES + 32 * 1024;
const FILE_KIND = CONFIG_FILE_KIND.SERVER_DZ;

type IdParams = { Params: { id: string } };
type RevisionParams = { Params: { id: string; revisionId: string } };

function parseOrSendError<T>(schema: ZodType<T>, input: unknown, reply: FastifyReply): T | null {
  const result = schema.safeParse(input);
  if (!result.success) {
    sendApiError(reply, 400, 'VALIDATION_FAILED', {
      message: result.error.issues[0].message,
      fieldErrors: formatZodFieldErrors(result.error),
    });
    return null;
  }
  return result.data;
}

function parseContentBodyOrSendError<T>(
  schema: ZodType<T>,
  input: unknown,
  reply: FastifyReply,
): T | null {
  const content =
    typeof input === 'object' && input !== null && 'content' in input ? input.content : undefined;
  if (typeof content === 'string' && Buffer.byteLength(content, 'utf8') > SERVER_CONFIG_MAX_BYTES) {
    sendApiError(reply, 413, 'CONFIG_FILE_TOO_LARGE', {
      message: `Configuration must not exceed ${SERVER_CONFIG_MAX_BYTES} bytes.`,
      params: { maxBytes: SERVER_CONFIG_MAX_BYTES },
    });
    return null;
  }
  return parseOrSendError(schema, input, reply);
}

function findServerOrSendError(
  fastify: FastifyInstance,
  id: string,
  reply: FastifyReply,
): Server | null {
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

function resolveServerOrSendError(
  fastify: FastifyInstance,
  params: unknown,
  reply: FastifyReply,
): Server | null {
  const parsed = parseOrSendError(serverIdParamSchema, params, reply);
  return parsed ? findServerOrSendError(fastify, parsed.id, reply) : null;
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (request.user?.role !== 'admin') {
    return sendApiError(
      reply,
      403,
      'AUTH_FORBIDDEN_ADMIN_REQUIRED',
      'Admin role required to manage server configuration files',
    );
  }
}

function sendServiceError(reply: FastifyReply, err: unknown) {
  if (err instanceof ConfigStorageError) {
    return sendApiError(reply, err.statusCode, err.errorCode, {
      message: err.message,
      ...(err.params !== undefined ? { params: err.params } : {}),
    });
  }
  throw err;
}

export const registerServerConfigRoutes: FastifyPluginAsync = async fastify => {
  const locks = new ConfigEditLockService(fastify.db, fastify.sqlite);
  const serverDz = new ServerDzConfigService({ db: fastify.db, sqlite: fastify.sqlite, locks });
  const routeOptions = {
    onRequest: [fastify.authenticate],
    preHandler: [requireAdmin],
    bodyLimit: CONFIG_ROUTE_BODY_LIMIT,
  };

  fastify.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    if (error.statusCode === 413) {
      return sendApiError(
        reply,
        413,
        'CONFIG_FILE_TOO_LARGE',
        `Request body must not exceed ${CONFIG_ROUTE_BODY_LIMIT} bytes.`,
      );
    }
    throw error;
  });

  fastify.get<IdParams>('/:id/config/server-dz', routeOptions, async (request, reply) => {
    const server = resolveServerOrSendError(fastify, request.params, reply);
    const query = server && parseOrSendError(getServerDzConfigQuerySchema, request.query, reply);
    if (!server || !query) {
      return;
    }
    try {
      return reply.send(
        serverDz.load(server, { userId: request.user.sub, sessionToken: query.sessionToken }),
      );
    } catch (err) {
      return sendServiceError(reply, err);
    }
  });

  fastify.post<IdParams>('/:id/config/server-dz/validate', routeOptions, async (request, reply) => {
    const server = resolveServerOrSendError(fastify, request.params, reply);
    const body =
      server &&
      parseContentBodyOrSendError(validateServerDzConfigRequestSchema, request.body, reply);
    if (!server || !body) {
      return;
    }
    return reply.send(serverDz.validate(server, body.content));
  });

  fastify.put<IdParams>('/:id/config/server-dz', routeOptions, async (request, reply) => {
    const server = resolveServerOrSendError(fastify, request.params, reply);
    const body =
      server && parseContentBodyOrSendError(saveServerDzConfigRequestSchema, request.body, reply);
    if (!server || !body) {
      return;
    }
    try {
      return reply.send(
        serverDz.save(
          server,
          { userId: request.user.sub, sessionToken: body.sessionToken },
          { baseHash: body.baseHash, content: body.content },
          request.log,
        ),
      );
    } catch (err) {
      return sendServiceError(reply, err);
    }
  });

  fastify.post<IdParams>(
    '/:id/config/server-dz/bootstrap',
    routeOptions,
    async (request, reply) => {
      const server = resolveServerOrSendError(fastify, request.params, reply);
      const body =
        server && parseOrSendError(bootstrapServerDzConfigRequestSchema, request.body, reply);
      if (!server || !body) {
        return;
      }
      try {
        return reply
          .status(201)
          .send(
            serverDz.bootstrap(
              server,
              { userId: request.user.sub, sessionToken: body.sessionToken },
              request.log,
            ),
          );
      } catch (err) {
        return sendServiceError(reply, err);
      }
    },
  );

  fastify.post<IdParams>('/:id/config/server-dz/lock', routeOptions, async (request, reply) => {
    const server = resolveServerOrSendError(fastify, request.params, reply);
    const body = server && parseOrSendError(acquireConfigLockRequestSchema, request.body, reply);
    if (!server || !body) {
      return;
    }
    const actor = { userId: request.user.sub, sessionToken: body.sessionToken };
    try {
      const lock = locks.acquire(server.id, FILE_KIND, actor, {
        takeover: body.takeover,
        logger: request.log,
      });
      return reply.send(locks.toResponse(lock, actor));
    } catch (err) {
      return sendServiceError(reply, err);
    }
  });

  fastify.post<IdParams>(
    '/:id/config/server-dz/lock/heartbeat',
    routeOptions,
    async (request, reply) => {
      const server = resolveServerOrSendError(fastify, request.params, reply);
      const body = server && parseOrSendError(configLockSessionRequestSchema, request.body, reply);
      if (!server || !body) {
        return;
      }
      const actor = { userId: request.user.sub, sessionToken: body.sessionToken };
      try {
        return reply.send(locks.toResponse(locks.heartbeat(server.id, FILE_KIND, actor), actor));
      } catch (err) {
        return sendServiceError(reply, err);
      }
    },
  );

  fastify.post<IdParams>(
    '/:id/config/server-dz/lock/release',
    routeOptions,
    async (request, reply) => {
      const server = resolveServerOrSendError(fastify, request.params, reply);
      const body = server && parseOrSendError(configLockSessionRequestSchema, request.body, reply);
      if (!server || !body) {
        return;
      }
      const released = locks.release(server.id, FILE_KIND, {
        userId: request.user.sub,
        sessionToken: body.sessionToken,
      });
      return reply.send(releaseConfigLockResponseSchema.parse({ released }));
    },
  );

  fastify.get<IdParams>('/:id/config/server-dz/revisions', routeOptions, async (request, reply) => {
    const server = resolveServerOrSendError(fastify, request.params, reply);
    if (!server) {
      return;
    }
    return reply.send(serverDz.listRevisions(server.id));
  });

  fastify.get<RevisionParams>(
    '/:id/config/server-dz/revisions/:revisionId',
    routeOptions,
    async (request, reply) => {
      const params = parseOrSendError(configRevisionParamSchema, request.params, reply);
      const server = params && findServerOrSendError(fastify, params.id, reply);
      if (!params || !server) {
        return;
      }
      try {
        return reply.send(serverDz.getRevision(server.id, params.revisionId));
      } catch (err) {
        return sendServiceError(reply, err);
      }
    },
  );

  fastify.post<RevisionParams>(
    '/:id/config/server-dz/revisions/:revisionId/restore',
    routeOptions,
    async (request, reply) => {
      const params = parseOrSendError(configRevisionParamSchema, request.params, reply);
      const server = params && findServerOrSendError(fastify, params.id, reply);
      const body =
        server && parseOrSendError(restoreConfigRevisionRequestSchema, request.body, reply);
      if (!params || !server || !body) {
        return;
      }
      try {
        return reply.send(
          serverDz.restore(
            server,
            { userId: request.user.sub, sessionToken: body.sessionToken },
            { revisionId: params.revisionId, baseHash: body.baseHash },
            request.log,
          ),
        );
      } catch (err) {
        return sendServiceError(reply, err);
      }
    },
  );

  fastify.post<IdParams>('/:id/config/battleye/sync', routeOptions, async (request, reply) => {
    const server = resolveServerOrSendError(fastify, request.params, reply);
    if (!server) {
      return;
    }
    const decrypted = decryptServerSecrets(server);
    if (!decrypted.ok) {
      return sendApiError(reply, 500, decrypted.errorCode, decrypted.message);
    }
    try {
      return reply.send(
        battlEyeConfigService.syncBattlEyeConfig(server, decrypted.secrets.rconPassword, {
          logger: request.log,
        }),
      );
    } catch (err) {
      return sendServiceError(reply, err);
    }
  });
};
