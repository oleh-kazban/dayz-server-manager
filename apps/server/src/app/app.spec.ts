import { apiErrorResponseSchema, healthResponseSchema } from '@aegis/api-contracts';

import { loadEnv } from '../config/env';

import { buildApp } from './app';

describe('Fastify App', () => {
  const config = loadEnv({
    PORT: '5000',
    SESSION_SECRET: 'test-session-secret-0123456789-abcdef',
    LOG_LEVEL: 'silent',
    CORS_ORIGIN: 'http://localhost:4200',
    DATABASE_PATH: ':memory:',
  });

  it('GET /api/v1/health returns 200 and valid schema', async () => {
    const app = buildApp({ config });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);

    const json = response.json();
    const result = healthResponseSchema.safeParse(json);

    expect(result.success).toBe(true);
    expect(json.status).toBe('ok');
    expect(json.uptime).toBeGreaterThanOrEqual(0);
    expect(new Date(json.timestamp).toString()).not.toBe('Invalid Date');

    await app.close();
    app.closeDb();
  });

  it('sets CORS headers according to config', async () => {
    const app = buildApp({ config });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: {
        origin: 'http://localhost:4200',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4200');

    await app.close();
    app.closeDb();
  });

  it('formats unhandled internal errors into structured INTERNAL_SERVER_ERROR without leaking stack traces', async () => {
    const app = buildApp({ config });
    app.get('/api/v1/boom', async () => {
      throw new Error('Sensitive database connection path C:\\secret\\db.sqlite');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/boom',
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
    expect(body.errorCode).toBe('INTERNAL_SERVER_ERROR');
    expect(body.message).toBe('An unexpected internal server error occurred.');
    expect(JSON.stringify(body)).not.toContain('C:\\secret\\db.sqlite');

    await app.close();
    app.closeDb();
  });

  describe('non-loopback listen warning', () => {
    const WARN_LEVEL = 40;

    async function listenAndCollectLogs(host: string) {
      const lines: string[] = [];
      const app = buildApp({
        config: { ...config, HOST: host, LOG_LEVEL: 'warn' },
        logStream: { write: line => lines.push(line) },
      });
      try {
        await app.listen({ port: 0, host: '127.0.0.1' });
      } finally {
        await app.close();
        app.closeDb();
      }
      return lines.map(line => JSON.parse(line) as { level: number; msg: string });
    }

    it('logs one warn-level line mentioning HTTPS when HOST is 0.0.0.0', async () => {
      const logs = await listenAndCollectLogs('0.0.0.0');

      const warnings = logs.filter(l => l.level === WARN_LEVEL && /HTTPS/.test(l.msg));
      expect(warnings).toHaveLength(1);
    });

    it('logs no HTTPS warning when HOST is 127.0.0.1', async () => {
      const logs = await listenAndCollectLogs('127.0.0.1');

      expect(logs.filter(l => /HTTPS/.test(l.msg))).toHaveLength(0);
    });
  });

  it('rejects an SSE ticket issued with role setup (role gate)', async () => {
    const app = buildApp({ config });
    app.get('/api/v1/__sse-probe', { onRequest: [app.authenticateSse] }, async () => ({ ok: 1 }));
    try {
      const { ticket } = app.sseTickets.issue({ sub: 'setup-user', role: 'setup' });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/__sse-probe?ticket=${encodeURIComponent(ticket)}`,
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
    } finally {
      await app.close();
      app.closeDb();
    }
  });
});
