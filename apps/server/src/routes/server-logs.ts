import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import path from 'node:path';

import {
  isServerActiveStatus,
  LOG_LINES_EVENT,
  serverLogKindSchema,
  serverLogStreamQuerySchema,
  serverLogTailSchema,
} from '@aegis/api-contracts';
import type { Server } from '@aegis/database';

import {
  findNewestLogFile,
  isPlainLogFileName,
  LogFollower,
  readLogTail,
  statFile,
} from '../services/logs/server-log';
import { openEventStream } from '../services/realtime/event-stream';
import { resolveProfileDirectory } from '../services/server/battleye-config.service';
import { ConfigStorageError } from '../services/server/config-atomic-writer';
import { formatZodFieldErrors, sendApiError } from '../utils/api-error';

import { resolveServerByIdOrSendError } from './servers';

type LogParams = { Params: { id: string; kind: string } };

/**
 * Resolves the server and the log kind (only `rpt` so far) and the profiles directory, or sends
 * the error. The directory is `null` while it does not exist yet (no logs written).
 */
function resolveLogTarget(
  fastify: FastifyInstance,
  params: { id: string; kind: string },
  reply: FastifyReply,
): { server: Server; dir: string | null } | null {
  const server = resolveServerByIdOrSendError(fastify, { id: params.id }, reply);
  if (!server) {
    return null;
  }
  const kind = serverLogKindSchema.safeParse(params.kind);
  if (!kind.success) {
    sendApiError(reply, 400, 'VALIDATION_FAILED', {
      message: `Unknown log kind '${params.kind}'.`,
      fieldErrors: formatZodFieldErrors(kind.error),
    });
    return null;
  }
  try {
    return { server, dir: resolveProfileDirectory(server) };
  } catch (error) {
    if (error instanceof ConfigStorageError) {
      sendApiError(reply, error.statusCode, error.errorCode, error.message);
      return null;
    }
    throw error;
  }
}

export const registerServerLogRoutes: FastifyPluginAsync = async fastify => {
  // GET /api/v1/servers/:id/logs/:kind - Tail of the newest log file, read on demand (DSM-00206)
  fastify.get<LogParams>(
    '/:id/logs/:kind',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const target = resolveLogTarget(fastify, request.params, reply);
      if (!target) {
        return;
      }
      const file = target.dir ? await findNewestLogFile(target.dir) : null;
      const tail = file
        ? await readLogTail(file.path, file.size)
        : { lines: [], offset: 0, truncated: false, firstLineNumber: 1, totalLines: 0 };
      return reply.send(
        serverLogTailSchema.parse({
          kind: 'rpt',
          file: file
            ? { name: file.name, size: file.size, modifiedAt: file.modifiedAt.toISOString() }
            : null,
          ...tail,
          live: isServerActiveStatus(target.server.status),
        }),
      );
    },
  );

  // GET /api/v1/servers/:id/logs/:kind/stream?ticket=&file=&from= - Live lines (DSM-00206)
  fastify.get<LogParams>(
    '/:id/logs/:kind/stream',
    { onRequest: [fastify.authenticateSse] },
    async (request, reply) => {
      const query = serverLogStreamQuerySchema.safeParse(request.query);
      if (!query.success) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', {
          message: query.error.issues[0].message,
          fieldErrors: formatZodFieldErrors(query.error),
        });
      }
      const target = resolveLogTarget(fastify, request.params, reply);
      if (!target) {
        return;
      }
      const { dir, server } = target;

      let file: { name: string; path: string } | null = null;
      if (query.data.file !== undefined) {
        if (!isPlainLogFileName(query.data.file)) {
          return sendApiError(
            reply,
            400,
            'SERVER_LOG_FILE_INVALID',
            'The log file must be an .RPT file name in the profiles directory.',
          );
        }
        const found = dir ? await statFile(path.join(dir, query.data.file), query.data.file) : null;
        if (!found) {
          return sendApiError(reply, 404, 'SERVER_LOG_NOT_FOUND', {
            message: `Log file '${query.data.file}' was not found.`,
            params: { name: server.name, file: query.data.file },
          });
        }
        file = found;
      }

      const stream = openEventStream(reply);
      const follower = new LogFollower({
        file,
        from: query.data.from,
        // No file yet: wait for the server to write one (profiles dir may not exist yet either).
        resolve: async () => {
          try {
            const current = resolveProfileDirectory(server);
            return current ? await findNewestLogFile(current) : null;
          } catch {
            return null;
          }
        },
        onLines: event => stream.send(LOG_LINES_EVENT, event),
      });
      follower.start();
      // The stream keeps its own heartbeat; the hub only ends it when the session ends.
      const untrack = fastify.sseHub.track(
        { userId: request.user.sub, sid: request.user.sid },
        stream.end,
      );
      stream.onClose(() => {
        untrack();
        follower.stop();
      });
    },
  );
};
