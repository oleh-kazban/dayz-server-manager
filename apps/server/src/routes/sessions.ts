import { and, desc, eq, gt, ne } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';

import { sessions } from '@aegis/database';

import { sendApiError } from '../utils/api-error';
import { parseUserAgent } from '../utils/user-agent';

export const registerSessionsRoutes: FastifyPluginAsync = async fastify => {
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const rows = fastify.db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, request.user.sub), gt(sessions.expiresAt, new Date())))
        .orderBy(desc(sessions.lastActiveAt))
        .all();

      const currentSid = request.user.sid;
      const mappedSessions = rows.map(s => ({
        id: s.id,
        userAgent: s.userAgent ?? null,
        ipAddress: s.ipAddress ?? null,
        deviceSummary: parseUserAgent(s.userAgent),
        lastActiveAt: s.lastActiveAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isCurrent: Boolean(currentSid && s.id === currentSid),
      }));

      return reply.send({
        sessions: mappedSessions,
        totalCount: mappedSessions.length,
      });
    },
  );

  fastify.delete(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const sessionId = (request.params as { id: string }).id;

      // GUARD-02: Anti-IDOR delete session strictly owned by user
      const result = fastify.db
        .delete(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, request.user.sub)))
        .run();

      if (result.changes === 0) {
        return sendApiError(reply, 404, 'AUTH_SESSION_NOT_FOUND', 'Session not found');
      }

      return reply.send({
        success: true,
        message: 'Session revoked successfully',
      });
    },
  );

  fastify.post(
    '/revoke-others',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const currentSid = request.user.sid;
      if (!currentSid) {
        return sendApiError(reply, 401, 'AUTH_SESSION_INVALID', 'No active session found');
      }

      const result = fastify.db
        .delete(sessions)
        .where(and(eq(sessions.userId, request.user.sub), ne(sessions.id, currentSid)))
        .run();

      return reply.send({
        revokedCount: result.changes,
        message: `Successfully revoked ${result.changes} other session${result.changes === 1 ? '' : 's'}`,
      });
    },
  );
};
