import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';

import { type DatabaseInstance, initDatabase } from '@dsm/database';

import { type EnvConfig } from '../config/env';
import { registerAuthRoutes } from '../routes/auth';
import { registerHealthRoutes } from '../routes/health';

export interface BuildAppOptions {
  config: EnvConfig;
  serverOptions?: FastifyServerOptions;
  db?: DatabaseInstance;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: options.config.LOG_LEVEL,
    },
    ...options.serverOptions,
  });

  const db = options.db ?? initDatabase({ dbPath: options.config.DATABASE_PATH });
  app.decorate('db', db);

  app.register(cors, {
    origin: options.config.CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
  });

  app.register(rateLimit, {
    global: false,
  });

  app.register(sensible);

  app.register(jwt, {
    secret: options.config.SESSION_SECRET,
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.unauthorized('Invalid or missing authentication token');
    }
  });

  app.register(registerHealthRoutes);
  app.register(registerAuthRoutes, { prefix: '/api/v1/auth' });

  return app;
}
