import { type FastifyInstance } from 'fastify';

import { type HealthResponseDto } from '@dsm/api-contracts';

export async function registerHealthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/v1/health', async (_request, reply): Promise<HealthResponseDto | void> => {
    try {
      if (fastify.db?.sqlite) {
        fastify.db.sqlite.prepare('SELECT 1').get();
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
  });
}
