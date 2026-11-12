import type { FastifyInstance, FastifyReply } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { type DatabaseInstance, initDatabase, sessions, users } from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

describe('Realtime Routes (/api/v1/realtime/sse)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let validAccessToken: string;
  let refreshToken: string;

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

    const now = new Date();
    const userId = '11111111-1111-4111-8111-111111111111';
    const sessionId = '22222222-2222-4222-8222-222222222222';

    dbInstance.db
      .insert(users)
      .values({
        id: userId,
        username: 'realtime-test-admin',
        passwordHash: 'hash',
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    dbInstance.db
      .insert(sessions)
      .values({
        id: sessionId,
        userId,
        refreshTokenHash: 'token-hash',
        deviceSummary: 'Test Client',
        ipAddress: '127.0.0.1',
        lastActiveAt: now,
        expiresAt: new Date(now.getTime() + 3600_000),
        createdAt: now,
      })
      .run();

    validAccessToken = app.jwt.sign({
      sub: userId,
      username: 'admin',
      role: 'admin',
      type: 'access',
      sid: sessionId,
    });

    refreshToken = app.jwt.sign({
      sub: userId,
      username: 'admin',
      role: 'admin',
      type: 'refresh',
      sid: sessionId,
    });
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  it('returns 401 when unauthenticated and does not invoke sseHub.subscribe', async () => {
    const subscribeSpy = vi.spyOn(app.sseHub, 'subscribe');

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/realtime/sse',
    });

    expect(res.statusCode).toBe(401);
    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  it('subscribes client to SSE event stream when authenticated via Authorization Bearer header', async () => {
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
      headers: {
        authorization: `Bearer ${validAccessToken}`,
      },
    });

    expect(subscribeSpy).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
  });

  it('subscribes client to SSE event stream when authenticated via ?token= query parameter', async () => {
    const subscribeSpy = vi
      .spyOn(app.sseHub, 'subscribe')
      .mockImplementation((reply: FastifyReply) => {
        reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream' });
        reply.raw.end();
        return 'mock-client-id';
      });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/sse?token=${encodeURIComponent(validAccessToken)}`,
    });

    expect(subscribeSpy).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
  });

  it('returns 401 when ?token= query parameter is invalid or a refresh token', async () => {
    const subscribeSpy = vi.spyOn(app.sseHub, 'subscribe');
    subscribeSpy.mockClear();

    const invalidRes = await app.inject({
      method: 'GET',
      url: '/api/v1/realtime/sse?token=invalid-jwt-token',
    });
    expect(invalidRes.statusCode).toBe(401);

    const refreshRes = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/sse?token=${encodeURIComponent(refreshToken)}`,
    });
    expect(refreshRes.statusCode).toBe(401);
    expect(subscribeSpy).not.toHaveBeenCalled();
  });
});
