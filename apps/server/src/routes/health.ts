import { type FastifyInstance } from 'fastify';

import { type HealthResponseDto } from '@aegis/api-contracts';

export async function registerHealthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/api/v1/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['status', 'uptime', 'timestamp'],
            properties: {
              status: { type: 'string', enum: ['ok'] },
              uptime: { type: 'number' },
              timestamp: { type: 'string' },
            },
          },
          503: {
            type: 'object',
            required: ['status', 'uptime', 'timestamp'],
            properties: {
              status: { type: 'string', enum: ['error'] },
              uptime: { type: 'number' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply): Promise<HealthResponseDto | void> => {
      try {
        if (fastify.sqlite) {
          fastify.sqlite.prepare('SELECT 1').get();
        }
        return {
          status: 'ok',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        };
      } catch {
        return reply.status(503).send({
          status: 'error',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        });
      }
    },
  );
}
