import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase } from '@dsm/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

describe('Auth Routes (/api/v1/auth)', () => {
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

  describe('POST /api/v1/auth/login', () => {
    it('returns 200 and tokens for valid admin credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          usernameOrEmail: 'admin',
          password: 'admin',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.expiresIn).toBe(900);
      expect(body.user).toEqual({
        id: expect.any(String),
        username: 'admin',
        email: 'admin@dsm.local',
        role: 'admin',
      });
    });

    it('returns 200 when logging in with email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          usernameOrEmail: 'admin@dsm.local',
          password: 'admin',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.username).toBe('admin');
    });

    it('returns 401 for incorrect password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          usernameOrEmail: 'admin',
          password: 'wrong-password',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toContain('Invalid username or password');
    });

    it('returns 401 for unknown user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          usernameOrEmail: 'nonexistent-user',
          password: 'some-password',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.message).toContain('Invalid username or password');
    });

    it('returns 400 when required fields are missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          usernameOrEmail: '',
          password: '',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns new access token for valid refresh token', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const { refreshToken } = loginRes.json();

      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(refreshRes.statusCode).toBe(200);
      const body = refreshRes.json();
      expect(body.accessToken).toBeDefined();
      expect(body.expiresIn).toBe(900);
    });

    it('returns 401 if access token is passed instead of refresh token', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const { accessToken } = loginRes.json();

      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: accessToken },
      });

      expect(refreshRes.statusCode).toBe(401);
    });

    it('returns 401 for corrupted refresh token', async () => {
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'invalid.jwt.token' },
      });

      expect(refreshRes.statusCode).toBe(401);
    });

    it('returns 400 for missing refresh token payload', async () => {
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {},
      });

      expect(refreshRes.statusCode).toBe(400);
    });

    it('returns 401 if user in refresh token is no longer in database', async () => {
      const ghostToken = app.jwt.sign(
        { sub: '00000000-0000-0000-0000-000000000000', type: 'refresh' },
        { expiresIn: '1h' },
      );

      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: ghostToken },
      });

      expect(refreshRes.statusCode).toBe(401);
      expect(refreshRes.json().message).toContain('User not found');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns user details when valid Bearer token is provided', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const { accessToken } = loginRes.json();

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(meRes.statusCode).toBe(200);
      const body = meRes.json();
      expect(body.username).toBe('admin');
      expect(body.role).toBe('admin');
    });

    it('returns 401 when Authorization header is missing', async () => {
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(meRes.statusCode).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer bogus.token.value',
        },
      });

      expect(meRes.statusCode).toBe(401);
    });

    it('returns 401 when user in access token is not found in database', async () => {
      const ghostAccessToken = app.jwt.sign(
        { sub: '00000000-0000-0000-0000-000000000000', type: 'access' },
        { expiresIn: '1h' },
      );

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${ghostAccessToken}`,
        },
      });

      expect(meRes.statusCode).toBe(401);
      expect(meRes.json().message).toContain('User not found');
    });
  });
});
