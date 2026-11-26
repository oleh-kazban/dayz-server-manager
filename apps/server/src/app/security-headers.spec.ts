import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase } from '@aegis/database';

import { signSession } from '../__fixtures__/session-token';
import { loadEnv } from '../config/env';

import { buildApp } from './app';

const EXPECTED = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
};

const expectHeaders = (headers: Record<string, unknown>) => {
  expect(headers).toMatchObject(EXPECTED);
};

describe('Security headers on every API response (AC-1)', () => {
  let app: FastifyInstance;
  let dbi: DatabaseInstance;
  let baseUrl: string;

  beforeAll(async () => {
    dbi = initDatabase({ dbPath: ':memory:' });
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      }),
      db: dbi,
    });
    baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
  });

  afterAll(async () => {
    await app.close();
    dbi.close();
  });

  it('sets them on /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBeLessThan(600);
    expectHeaders(res.headers);
  });

  it('sets them on an authenticated success response', async () => {
    const signed = signSession(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/sessions',
      headers: { authorization: `Bearer ${signed.accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expectHeaders(res.headers);
  });

  it('sets them on a 401 error body', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/sessions' });
    expect(res.statusCode).toBe(401);
    expectHeaders(res.headers);
  });

  it('sets them on a 400 validation error', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: {} });
    expect(res.statusCode).toBe(400);
    expectHeaders(res.headers);
  });

  it('sets them on a 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/does-not-exist' });
    expect(res.statusCode).toBe(404);
    expectHeaders(res.headers);
  });

  it('sets them on a 429 rate-limit response', async () => {
    const responses = [];
    for (let i = 0; i < 11; i++) {
      responses.push(
        await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { usernameOrEmail: 'nobody', password: 'wrong' },
        }),
      );
    }
    const last = responses[10];
    expect(last.statusCode).toBe(429);
    expectHeaders(last.headers);
  });

  it('sets them on a CORS preflight response', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/auth/login',
      headers: {
        origin: 'http://localhost:4200',
        'access-control-request-method': 'POST',
      },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
    expectHeaders(res.headers);
  });

  it('sets them on a real event stream response', async () => {
    const signed = signSession(app);
    const res = await fetch(`${baseUrl}/api/v1/realtime/sse`, {
      headers: { authorization: `Bearer ${signed.accessToken}` },
    });
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    try {
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      expect(Object.fromEntries(res.headers)).toMatchObject(EXPECTED);
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  });
});

describe('Unknown route with secrets in the query (AC-1, AC-3)', () => {
  it('answers a 404 without the URL, with the headers, and logs neither secret', async () => {
    const lines: string[] = [];
    const dbi = initDatabase({ dbPath: ':memory:' });
    const app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'info',
      }),
      db: dbi,
      logStream: { write: line => lines.push(line) },
    });
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/nope?ticket=SECRET-1&sessionToken=SECRET-2',
      });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Route not found',
      });
      expectHeaders(res.headers);
      const log = lines.join('\n');
      expect(log).not.toContain('SECRET-1');
      expect(log).not.toContain('SECRET-2');
    } finally {
      await app.close();
      dbi.close();
    }
  });
});

describe('Request log redaction in the app (AC-3)', () => {
  it('does not leave a sessionToken query value in the log output', async () => {
    const lines: string[] = [];
    const dbi = initDatabase({ dbPath: ':memory:' });
    const app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'info',
      }),
      db: dbi,
      logStream: { write: line => lines.push(line) },
    });
    try {
      await app.inject({ method: 'GET', url: '/health?sessionToken=SECRET-VALUE-123&x=1' });
      await app.inject({ method: 'GET', url: '/health?session%54oken=SECRET-ENCODED-456' });
      const log = lines.join('\n');
      expect(log).toContain('sessionToken=[REDACTED]');
      expect(log).not.toContain('SECRET-VALUE-123');
      expect(log).not.toContain('SECRET-ENCODED-456');
    } finally {
      await app.close();
      dbi.close();
    }
  });
});
