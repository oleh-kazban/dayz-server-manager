import { apiErrorResponseSchema, healthResponseSchema } from '@dsm/api-contracts';

import { loadEnv } from '../config/env';

import { buildApp } from './app';

describe('Fastify App', () => {
  const config = loadEnv({
    PORT: '5000',
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
    app.db.close();
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
    app.db.close();
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
    app.db.close();
  });
});
