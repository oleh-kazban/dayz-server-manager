import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { realtimeTicketResponseSchema } from '@aegis/api-contracts';

import { sendApiError } from '../utils/api-error';

export const registerRealtimeRoutes: FastifyPluginAsync = async fastify => {
  /**
   * DSM-00348: `EventSource` cannot send an Authorization header, so a browser opens the stream
   * with a single-use ticket instead of the access token. Other clients may still use the header.
   */
  async function authenticateSse(request: FastifyRequest, reply: FastifyReply) {
    const ticket = (request.query as Record<string, unknown> | undefined)?.ticket;
    if (typeof ticket !== 'string' || ticket.length === 0) {
      return fastify.authenticate(request, reply);
    }
    const identity = fastify.sseTickets.consume(ticket);
    if (!identity) {
      return sendApiError(
        reply,
        401,
        'AUTH_SSE_TICKET_INVALID',
        'The realtime ticket is invalid, expired or already used',
      );
    }
    if (identity.sid && !fastify.isSessionActive(identity.sid)) {
      return sendApiError(reply, 401, 'AUTH_SESSION_INVALID', 'Session is invalid or expired');
    }
    request.user = { ...identity, type: 'access' };
  }

  // POST /api/v1/realtime/ticket - Single-use ticket for one SSE connection (DSM-00348)
  fastify.post('/ticket', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { sub, username, role, sid } = request.user;
    const { ticket, expiresAt } = fastify.sseTickets.issue({ sub, username, role, sid });
    return reply.send(
      realtimeTicketResponseSchema.parse({ ticket, expiresAt: expiresAt.toISOString() }),
    );
  });

  // GET /api/v1/realtime/sse?ticket=… - Server-sent events (DSM-00173)
  fastify.get('/sse', { onRequest: [authenticateSse] }, async (request, reply) => {
    fastify.sseHub.subscribe(reply, request);
  });
};
