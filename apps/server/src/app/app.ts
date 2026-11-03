import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import { type EnvConfig } from '../config/env';
import { registerHealthRoutes } from '../routes/health';

export interface BuildAppOptions {
  config: EnvConfig;
  serverOptions?: FastifyServerOptions;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: options.config.LOG_LEVEL,
    },
    ...options.serverOptions,
  });

  app.register(cors, {
    origin: options.config.CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
  });

  app.register(sensible);

  app.register(registerHealthRoutes);

  return app;
}
