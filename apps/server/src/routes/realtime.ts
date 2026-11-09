import type { FastifyPluginAsync } from 'fastify';

export const registerRealtimeRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/sse', async (request, reply) => {
    fastify.sseHub.subscribe(reply, request);
  });
};
