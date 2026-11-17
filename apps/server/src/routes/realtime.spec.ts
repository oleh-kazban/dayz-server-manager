import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { realtimeTicketResponseSchema } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase, sessions, users } from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

const SESSION_ID = '22222222-2222-4222-8222-222222222222';

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
    const sessionId = SESSION_ID;

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

  const mockSubscribe = () =>
    vi.spyOn(app.sseHub, 'subscribe').mockImplementation((reply: FastifyReply) => {
      reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream' });
      reply.raw.end();
      return 'mock-client-id';
    });

  const issueTicket = async (token = validAccessToken) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/realtime/ticket',
      headers: { authorization: `Bearer ${token}` },
    });

  it('issues a single-use ticket that opens the stream once (DSM-00348)', async () => {
    const subscribeSpy = mockSubscribe();

    const issued = await issueTicket();
    expect(issued.statusCode).toBe(200);
    const { ticket, expiresAt } = realtimeTicketResponseSchema.parse(issued.json());
    expect(Date.parse(expiresAt) - Date.now()).toBeGreaterThan(25_000);

    const opened = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/sse?ticket=${encodeURIComponent(ticket)}`,
    });
    expect(opened.statusCode).toBe(200);
    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    const reused = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/sse?ticket=${encodeURIComponent(ticket)}`,
    });
    expect(reused.statusCode).toBe(401);
    expect(reused.json().errorCode).toBe('AUTH_SSE_TICKET_INVALID');
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown ticket and no longer accepts ?token= (DSM-00348)', async () => {
    const subscribeSpy = vi.spyOn(app.sseHub, 'subscribe');
    subscribeSpy.mockClear();

    const unknown = await app.inject({ method: 'GET', url: '/api/v1/realtime/sse?ticket=nope' });
    expect(unknown.statusCode).toBe(401);
    expect(unknown.json().errorCode).toBe('AUTH_SSE_TICKET_INVALID');

    const tokenInUrl = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/sse?token=${encodeURIComponent(validAccessToken)}`,
    });
    expect(tokenInUrl.statusCode).toBe(401);
    expect(tokenInUrl.json().errorCode).toBe('AUTH_TOKEN_MISSING_OR_INVALID');
    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  it('requires an access token (not a refresh token) to issue a ticket', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/v1/realtime/ticket' })).statusCode).toBe(
      401,
    );
    const refresh = await issueTicket(refreshToken);
    expect(refresh.statusCode).toBe(401);
    expect(refresh.json().errorCode).toBe('AUTH_TOKEN_TYPE_INVALID');
  });

  it('refuses a ticket whose session ended after it was issued', async () => {
    const subscribeSpy = vi.spyOn(app.sseHub, 'subscribe');
    subscribeSpy.mockClear();
    const { ticket } = realtimeTicketResponseSchema.parse((await issueTicket()).json());
    dbInstance.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(sessions.id, SESSION_ID))
      .run();
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/realtime/sse?ticket=${encodeURIComponent(ticket)}`,
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().errorCode).toBe('AUTH_SESSION_INVALID');
      expect(subscribeSpy).not.toHaveBeenCalled();
    } finally {
      dbInstance.db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() + 3600_000) })
        .where(eq(sessions.id, SESSION_ID))
        .run();
    }
  });

  it('opens the stream for a ticket of a session-less token', async () => {
    mockSubscribe();
    const sessionless = app.jwt.sign({ sub: 'svc', role: 'admin', type: 'access' });
    const { ticket } = realtimeTicketResponseSchema.parse((await issueTicket(sessionless)).json());
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/realtime/sse?ticket=${encodeURIComponent(ticket)}`,
    });
    expect(response.statusCode).toBe(200);
  });
});

describe('Request logs never contain credentials (DSM-00348)', () => {
  it('redacts SSE tickets and tokens in logged request URLs', async () => {
    const lines: string[] = [];
    const dbInstance = initDatabase({ dbPath: ':memory:' });
    const app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'info',
      }),
      db: dbInstance,
      logStream: { write: line => lines.push(line) },
    });
    await app.ready();
    try {
      const token = app.jwt.sign({ sub: 'svc', role: 'admin', type: 'access' });
      const { ticket } = realtimeTicketResponseSchema.parse(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/realtime/ticket',
            headers: { authorization: `Bearer ${token}` },
          })
        ).json(),
      );
      await app.inject({ method: 'GET', url: `/api/v1/realtime/sse?ticket=${ticket}&x=1` });
      await app.inject({ method: 'GET', url: `/api/v1/realtime/sse?token=${token}` });

      const log = lines.join('\n');
      expect(log).toContain('/api/v1/realtime/sse?ticket=[REDACTED]&x=1');
      expect(log).toContain('/api/v1/realtime/sse?token=[REDACTED]');
      expect(log).not.toContain(ticket);
      expect(log).not.toContain(token);
    } finally {
      await app.close();
      dbInstance.close();
    }
  });
});
