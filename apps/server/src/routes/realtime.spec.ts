import type { FastifyInstance, FastifyReply } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { type DatabaseInstance, initDatabase } from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

describe('Realtime Routes (/api/v1/realtime/sse)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;

  beforeAll(async () => {
    dbInstance = initDatabase({ dbPath: ':memory:' });
    const config = loadEnv({
      SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
      LOG_LEVEL: 'silent',
    });

    app = buildApp({
      config,
      db: dbInstance,
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  it('subscribes client to SSE event stream via fastify.sseHub', async () => {
    const subscribeSpy = vi
      .spyOn(app.sseHub, 'subscribe')
      .mockImplementation((reply: FastifyReply) => {
        reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream' });
        reply.raw.end();
        return 'mock-client-id';
      });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/realtime/sse',
    });

    expect(subscribeSpy).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
  });
});
