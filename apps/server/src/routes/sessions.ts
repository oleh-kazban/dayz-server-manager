import { and, desc, eq, gt } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';

import { sessions } from '@aegis/database';

import { revokeSessions } from '../services/identity/sessions';
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

      // GUARD-02: Anti-IDOR, only a session owned by the user is revoked
      const owned = fastify.db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, request.user.sub)))
        .get();
      if (!owned) {
        return sendApiError(reply, 404, 'AUTH_SESSION_NOT_FOUND', 'Session not found');
      }
      revokeSessions({ db: fastify.db, hub: fastify.sseHub }, { sid: sessionId });

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
      const revoked = revokeSessions(
        { db: fastify.db, hub: fastify.sseHub },
        { userId: request.user.sub, exceptSid: request.user.sid },
      );
      const count = revoked.length;

      return reply.send({
        revokedCount: count,
        message: `Successfully revoked ${count} other session${count === 1 ? '' : 's'}`,
      });
    },
  );
};
