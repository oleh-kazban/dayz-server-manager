import type { FastifyPluginAsync, FastifyReply } from 'fastify';

import { restartServerRequestSchema, stopServerRequestSchema } from '@aegis/api-contracts';

import { requireAdmin } from '../app/role-guards';
import { ConfigStorageError } from '../services/server/config-atomic-writer';
import { LifecycleError } from '../services/server/server-lifecycle.service';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

import { resolveServerByIdOrSendError, sendServerDetail } from './servers';

type IdParams = { Params: { id: string } };

function sendLifecycleError(reply: FastifyReply, error: unknown) {
  if (error instanceof LifecycleError || error instanceof ConfigStorageError) {
    return sendApiError(reply, error.statusCode, error.errorCode, {
      message: error.message,
      params: error.params,
    });
  }
  throw error;
}

export const registerServerLifecycleRoutes: FastifyPluginAsync = async fastify => {
  // POST /api/v1/servers/:id/start - Start the DayZ server process (DSM-00162)
  fastify.post<IdParams>(
    '/:id/start',
    { onRequest: [fastify.authenticate, requireAdmin] },
    async (request, reply) => {
      const server = resolveServerByIdOrSendError(fastify, request.params, reply);
      if (!server) {
        return;
      }
      try {
        return sendServerDetail(reply, await fastify.lifecycle.start(server.id));
      } catch (error) {
        return sendLifecycleError(reply, error);
      }
    },
  );

  // POST /api/v1/servers/:id/stop - Graceful stop via RCON #shutdown with a watchdog (DSM-00163),
  // optionally after a delay with an in-game warning (DSM-00167). The body is optional.
  fastify.post<IdParams & { Body: unknown }>(
    '/:id/stop',
    { onRequest: [fastify.authenticate, requireAdmin] },
    async (request, reply) => {
      const server = resolveServerByIdOrSendError(fastify, request.params, reply);
      if (!server) {
        return;
      }
      const body = stopServerRequestSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: body.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(body.error),
        });
      }
      try {
        return sendServerDetail(reply, await fastify.lifecycle.gracefulStop(server.id, body.data));
      } catch (error) {
        return sendLifecycleError(reply, error);
      }
    },
  );

  // POST /api/v1/servers/:id/restart - Graceful stop (now or delayed), then start (DSM-00168).
  // Returns once the stop is requested; the start runs when the process has exited.
  fastify.post<IdParams & { Body: unknown }>(
    '/:id/restart',
    { onRequest: [fastify.authenticate, requireAdmin] },
    async (request, reply) => {
      const server = resolveServerByIdOrSendError(fastify, request.params, reply);
      if (!server) {
        return;
      }
      const body = restartServerRequestSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: body.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(body.error),
        });
      }
      try {
        return sendServerDetail(reply, await fastify.lifecycle.restart(server.id, body.data));
      } catch (error) {
        return sendLifecycleError(reply, error);
      }
    },
  );

  // POST /api/v1/servers/:id/stop/cancel - Cancel a pending delayed stop (DSM-00167)
  fastify.post<IdParams>(
    '/:id/stop/cancel',
    { onRequest: [fastify.authenticate, requireAdmin] },
    async (request, reply) => {
      const server = resolveServerByIdOrSendError(fastify, request.params, reply);
      if (!server) {
        return;
      }
      try {
        return sendServerDetail(reply, await fastify.lifecycle.cancelPendingStop(server.id));
      } catch (error) {
        return sendLifecycleError(reply, error);
      }
    },
  );

  // POST /api/v1/servers/:id/force-stop - Kill the process tree without RCON shutdown (DSM-00162)
  fastify.post<IdParams>(
    '/:id/force-stop',
    { onRequest: [fastify.authenticate, requireAdmin] },
    async (request, reply) => {
      const server = resolveServerByIdOrSendError(fastify, request.params, reply);
      if (!server) {
        return;
      }
      try {
        return sendServerDetail(reply, await fastify.lifecycle.forceStop(server.id));
      } catch (error) {
        return sendLifecycleError(reply, error);
      }
    },
  );
};
