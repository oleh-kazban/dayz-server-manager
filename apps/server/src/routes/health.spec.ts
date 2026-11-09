import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { healthResponseSchema } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase } from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

describe('Health Routes (/api/v1/health)', () => {
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

  it('returns 200 and healthy payload when database is connected', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('returns 503 and degraded payload when database query fails', async () => {
    const failingDb: DatabaseInstance = {
      db: {} as unknown as DatabaseInstance['db'],
      sqlite: {
        prepare: () => {
          throw new Error('Database disk image is malformed');
        },
        close: () => {},
      } as unknown as DatabaseInstance['sqlite'],
      close: () => {},
    };

    const failingApp = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      }),
      db: failingDb,
    });

    await failingApp.ready();

    const response = await failingApp.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(healthResponseSchema.safeParse(body).success).toBe(true);
    expect(body.status).toBe('error');
    expect(body.uptime).toBeDefined();
    expect(body.timestamp).toBeDefined();

    await failingApp.close();
  });
});
