import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';

import { CONFIG_FILE_KIND, serverIdParamSchema } from '@aegis/api-contracts';
import { servers } from '@aegis/database';

import { requireAdmin } from '../app/role-guards';
import { ConfigEditLockService } from '../services/server/config-edit-lock.service';
import { buildLaunchCommandPreview } from '../services/server/launch-command.service';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

import { listServerModRows } from './server-mods';

export const registerLaunchCommandRoutes: FastifyPluginAsync = async fastify => {
  // GET /api/v1/servers/:id/launch-command - Non-mutating compiled launch command preview (DSM-00125)
  fastify.get<{ Params: { id: string } }>(
    '/:id/launch-command',
    {
      onRequest: [fastify.authenticate, requireAdmin],
    },
    async (request, reply) => {
      const paramResult = serverIdParamSchema.safeParse(request.params);
      if (!paramResult.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: paramResult.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(paramResult.error),
        });
      }

      const { id } = paramResult.data;
      const server = fastify.db.select().from(servers).where(eq(servers.id, id)).get();
      if (!server) {
        return sendApiError(reply, 404, 'SERVER_NOT_FOUND', {
          message: `Server with ID '${id}' not found`,
          params: { id },
        });
      }

      // Start readiness for the UI (DSM-00169): an active serverDZ.cfg edit lock blocks starting.
      const lock = new ConfigEditLockService(fastify.db, fastify.sqlite).getActive(
        id,
        CONFIG_FILE_KIND.SERVER_DZ,
      );
      return reply.send({
        ...buildLaunchCommandPreview(server, listServerModRows(fastify, id)),
        editLock: lock
          ? { holderName: lock.holderName, acquiredAt: lock.acquiredAt.toISOString() }
          : null,
      });
    },
  );
};
