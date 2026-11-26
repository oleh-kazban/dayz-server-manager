import type { FastifyPluginAsync } from 'fastify';

import { realtimeTicketResponseSchema } from '@aegis/api-contracts';

export const registerRealtimeRoutes: FastifyPluginAsync = async fastify => {
  // POST /api/v1/realtime/ticket - Single-use ticket for one SSE connection (DSM-00348)
  fastify.post('/ticket', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { sub, username, role, sid } = request.user;
    const { ticket, expiresAt } = fastify.sseTickets.issue({ sub, username, role, sid });
    return reply.send(
      realtimeTicketResponseSchema.parse({ ticket, expiresAt: expiresAt.toISOString() }),
    );
  });

  // GET /api/v1/realtime/sse?ticket=… - Server-sent events (DSM-00173)
  fastify.get('/sse', { onRequest: [fastify.authenticateSse] }, async (request, reply) => {
    fastify.sseHub.subscribe(reply, { userId: request.user.sub, sid: request.user.sid }, request);
  });
};
