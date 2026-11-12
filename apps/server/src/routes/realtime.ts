import type { FastifyPluginAsync } from 'fastify';

export const registerRealtimeRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/sse', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    fastify.sseHub.subscribe(reply, request);
  });
};
