import { type FastifyInstance } from 'fastify';

import { type HealthResponseDto } from '@dsm/api-contracts';

export async function registerHealthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/v1/health', async (): Promise<HealthResponseDto> => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });
}
