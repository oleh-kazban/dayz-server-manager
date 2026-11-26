import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase } from '@aegis/database';

import { loadEnv } from '../config/env';

import { buildApp } from './app';

describe('JSON body parser (AC-2)', () => {
  let app: FastifyInstance;
  let dbi: DatabaseInstance;

  beforeAll(() => {
    dbi = initDatabase({ dbPath: ':memory:' });
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      }),
      db: dbi,
    });
  });

  afterAll(async () => {
    await app.close();
    dbi.close();
  });

  const login = (body: string) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: body,
    });

  it('still handles a normal body', async () => {
    const res = await login(JSON.stringify({ usernameOrEmail: 'x', password: 'y' }));
    expect(res.statusCode).toBe(401);
    expect(res.json().errorCode).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('accepts an empty body as undefined (route validation answers 400)', async () => {
    const res = await login('');
    expect(res.statusCode).toBe(400);
    expect(res.json().errorCode).toBe('VALIDATION_FAILED');
  });

  it('answers invalid JSON with 400 VALIDATION_FAILED', async () => {
    const res = await login('{not json');
    expect(res.statusCode).toBe(400);
    expect(res.json().errorCode).toBe('VALIDATION_FAILED');
  });

  it.each([
    [
      'a top-level __proto__ key',
      '{"usernameOrEmail":"x","password":"y","__proto__":{"polluted":1}}',
    ],
    [
      'a nested __proto__ key',
      '{"usernameOrEmail":"x","password":"y","a":{"b":[{"__proto__":{"polluted":1}}]}}',
    ],
    [
      'a constructor.prototype key',
      '{"usernameOrEmail":"x","password":"y","constructor":{"prototype":{"polluted":1}}}',
    ],
    [
      'a nested constructor.prototype key',
      '{"usernameOrEmail":"x","password":"y","a":{"constructor":{"prototype":{"polluted":1}}}}',
    ],
  ])('rejects %s with 400 VALIDATION_FAILED', async (_name, body) => {
    const res = await login(body);
    expect(res.statusCode).toBe(400);
    expect(res.json().errorCode).toBe('VALIDATION_FAILED');
  });
});
