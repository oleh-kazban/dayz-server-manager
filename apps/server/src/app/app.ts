import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { eq } from 'drizzle-orm';
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';

import { type UserRole } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase, sessions } from '@aegis/database';
import { createProcessManager, type ProcessManager } from '@aegis/platform';

import { type EnvConfig } from '../config/env';
import { registerAuthRoutes } from '../routes/auth';
import { registerHealthRoutes } from '../routes/health';
import { registerLaunchCommandRoutes } from '../routes/launch-command';
import { registerProfileRoutes } from '../routes/profile';
import { registerRealtimeRoutes } from '../routes/realtime';
import { registerServerConfigRoutes } from '../routes/server-config';
import { registerServerLifecycleRoutes } from '../routes/server-lifecycle';
import { registerServerModsRoutes } from '../routes/server-mods';
import { registerServersRoutes } from '../routes/servers';
import { registerSessionsRoutes } from '../routes/sessions';
import { registerSteamRoutes } from '../routes/steam';
import { registerWorkshopRoutes } from '../routes/workshop';
import { sseHub } from '../services/realtime/sse-hub';
import { ConfigEditLockService } from '../services/server/config-edit-lock.service';
import { ServerLifecycleService } from '../services/server/server-lifecycle.service';
import { sendApiError } from '../utils/api-error';

export interface BuildAppOptions {
  config: EnvConfig;
  serverOptions?: FastifyServerOptions;
  db?: DatabaseInstance;
  /** OS process adapter; defaults to the platform implementation (DSM-00160). */
  processManager?: ProcessManager;
  /** Skip reconciling stored server processes on startup (tests that seed state later). */
  skipLifecycleReconcile?: boolean;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: options.config.LOG_LEVEL,
    },
    ...options.serverOptions,
  });

  const dbInstance = options.db ?? initDatabase({ dbPath: options.config.DATABASE_PATH });
  app.decorate('db', dbInstance.db);
  app.decorate('sqlite', dbInstance.sqlite);
  app.decorate('closeDb', () => dbInstance.close());
  app.decorate('sseHub', sseHub);

  const lifecycle = new ServerLifecycleService(
    {
      db: dbInstance.db,
      sqlite: dbInstance.sqlite,
      processes: options.processManager ?? createProcessManager(),
      locks: new ConfigEditLockService(dbInstance.db, dbInstance.sqlite),
    },
    {
      startupWindowMs: options.config.DSM_SERVER_STARTUP_WINDOW_MS,
      pollIntervalMs: options.config.DSM_SERVER_POLL_INTERVAL_MS,
      logger: app.log,
      broadcast: (event, data) => sseHub.broadcast(event, data),
    },
  );
  app.decorate('lifecycle', lifecycle);
  if (!options.skipLifecycleReconcile) {
    // A failed reconciliation must not keep DSM from booting (health then reports the cause).
    app.addHook('onReady', async () => {
      try {
        await lifecycle.reconcile();
      } catch (error) {
        app.log.error(error, 'Failed to reconcile server processes on startup');
      }
    });
  }
  // Only timers stop; DayZ processes keep running across DSM restarts (DSM-00160 D1).
  app.addHook('onClose', async () => lifecycle.close());

  // Allow empty bodies when Content-Type: application/json is sent on DELETE/GET requests
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, defaultDone) => {
    if (typeof body === 'string' && body.trim() === '') {
      return defaultDone(null, undefined);
    }
    try {
      const json = JSON.parse(body as string);
      return defaultDone(null, json);
    } catch (err) {
      return defaultDone(err as Error, undefined);
    }
  });

  app.register(cors, {
    origin: options.config.CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
  });

  app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded, retry in ${context.after}`,
    }),
  });

  app.register(sensible);

  app.register(jwt, {
    secret: options.config.SESSION_SECRET,
  });

  app.setErrorHandler(
    (error: Error & { statusCode?: number; errorCode?: string }, _request, reply) => {
      const statusCode = error.statusCode ?? 500;
      if (statusCode === 429) {
        return sendApiError(reply, 429, 'AUTH_RATE_LIMIT_EXCEEDED', error.message);
      }
      if (statusCode === 400) {
        return sendApiError(reply, 400, 'VALIDATION_FAILED', error.message);
      }
      app.log.error(error);
      return sendApiError(
        reply,
        500,
        'INTERNAL_SERVER_ERROR',
        'An unexpected internal server error occurred.',
      );
    },
  );

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      type JwtPayload = {
        sub: string;
        username?: string;
        role?: UserRole;
        type?: 'access' | 'refresh';
        sid?: string;
      };

      const queryToken = !request.headers.authorization
        ? (request.query as Record<string, unknown> | undefined)?.token
        : undefined;

      let payload: JwtPayload;
      if (typeof queryToken === 'string' && queryToken.length > 0) {
        payload = app.jwt.verify<JwtPayload>(queryToken);
        request.user = payload;
      } else {
        payload = await request.jwtVerify<JwtPayload>();
      }

      if (!payload || payload.type !== 'access') {
        return sendApiError(
          reply,
          401,
          'AUTH_TOKEN_TYPE_INVALID',
          'Invalid token type for authorization',
        );
      }

      if (payload.sid) {
        const session = app.db.select().from(sessions).where(eq(sessions.id, payload.sid)).get();
        if (!session || session.expiresAt.getTime() <= Date.now()) {
          return sendApiError(reply, 401, 'AUTH_SESSION_INVALID', 'Session is invalid or expired');
        }

        // SQLite WAL Write Contention Guard (ARCH-04): throttled to 60s
        const now = Date.now();
        if (now - session.lastActiveAt.getTime() > 60_000) {
          app.db
            .update(sessions)
            .set({ lastActiveAt: new Date(now) })
            .where(eq(sessions.id, session.id))
            .run();
        }
      }
    } catch {
      return sendApiError(
        reply,
        401,
        'AUTH_TOKEN_MISSING_OR_INVALID',
        'Invalid or missing authentication token',
      );
    }
  });

  app.register(registerHealthRoutes);
  app.register(registerAuthRoutes, { prefix: '/api/v1/auth' });
  app.register(registerProfileRoutes, { prefix: '/api/v1/profile' });
  app.register(registerProfileRoutes, { prefix: '/api/v1/auth/profile' });
  app.register(registerSessionsRoutes, { prefix: '/api/v1/auth/sessions' });
  app.register(registerServersRoutes, { prefix: '/api/v1/servers' });
  app.register(registerServerModsRoutes, { prefix: '/api/v1/servers' });
  app.register(registerServerConfigRoutes, { prefix: '/api/v1/servers' });
  app.register(registerLaunchCommandRoutes, { prefix: '/api/v1/servers' });
  app.register(registerServerLifecycleRoutes, { prefix: '/api/v1/servers' });
  app.register(registerRealtimeRoutes, { prefix: '/api/v1/realtime' });
  app.register(registerSteamRoutes, { prefix: '/api/v1/settings/steam' });
  app.register(registerWorkshopRoutes, { prefix: '/api/v1/workshop' });

  return app;
}
