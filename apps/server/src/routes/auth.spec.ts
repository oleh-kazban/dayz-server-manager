import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { apiErrorResponseSchema } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase, sessions } from '@aegis/database';

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
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_INVALID_CREDENTIALS');
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
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_INVALID_CREDENTIALS');
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
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      expect(body.fieldErrors).toBeDefined();
      expect(body.fieldErrors.usernameOrEmail).toBeDefined();
      expect(body.fieldErrors.password).toBeDefined();
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
      const body = refreshRes.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_TOKEN_TYPE_INVALID');
    });

    it('returns 401 for corrupted refresh token', async () => {
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'invalid.jwt.token' },
      });

      expect(refreshRes.statusCode).toBe(401);
      const body = refreshRes.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_REFRESH_TOKEN_INVALID');
    });

    it('returns 400 for missing refresh token payload', async () => {
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {},
      });

      expect(refreshRes.statusCode).toBe(400);
      const body = refreshRes.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      expect(body.fieldErrors?.refreshToken).toBeDefined();
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
      const body = refreshRes.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_USER_NOT_FOUND');
      expect(body.message).toContain('User not found');
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
      const body = meRes.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_TOKEN_MISSING_OR_INVALID');
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
      const body = meRes.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_TOKEN_MISSING_OR_INVALID');
    });

    it('returns 401 when a refresh token is used as Bearer token', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const { refreshToken } = loginRes.json();

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${refreshToken}`,
        },
      });

      expect(meRes.statusCode).toBe(401);
      const body = meRes.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_TOKEN_TYPE_INVALID');
      expect(body.message).toContain('Invalid token type for authorization');
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
      const body = meRes.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_USER_NOT_FOUND');
      expect(body.message).toContain('User not found');
    });
  });

  describe('Rate Limiting', () => {
    let rateLimitedApp: FastifyInstance;
    let rateLimitedDb: DatabaseInstance;

    beforeAll(async () => {
      rateLimitedDb = initDatabase({ dbPath: ':memory:' });
      const config = loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      });
      rateLimitedApp = buildApp({
        config,
        db: rateLimitedDb,
      });
      await rateLimitedApp.ready();
    });

    afterAll(async () => {
      await rateLimitedApp.close();
      rateLimitedDb.close();
    });

    it('returns 429 Too Many Requests when rate limit threshold is exceeded', async () => {
      // Exhaust the 10 request limit on /login
      for (let i = 0; i < 10; i++) {
        await rateLimitedApp.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { usernameOrEmail: 'admin', password: 'wrong-password' },
        });
      }

      // The 11th request should be rate-limited
      const response = await rateLimitedApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });

      expect(response.statusCode).toBe(429);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_RATE_LIMIT_EXCEEDED');
      expect(body.message).toContain('Rate limit exceeded');
    });
  });

  describe('Stateful Session Tracking & Invalidation', () => {
    let sessionApp: FastifyInstance;
    let sessionDb: DatabaseInstance;

    beforeAll(async () => {
      sessionDb = initDatabase({ dbPath: ':memory:' });
      const config = loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      });
      sessionApp = buildApp({
        config,
        db: sessionDb,
      });
      await sessionApp.ready();
    });

    afterAll(async () => {
      await sessionApp.close();
      sessionDb.close();
    });

    it('creates a session with 30-day expiration when rememberMe is true', async () => {
      const response = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          usernameOrEmail: 'admin',
          password: 'admin',
          rememberMe: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const payload = sessionApp.jwt.decode<{ sid: string }>(body.accessToken);
      expect(payload?.sid).toBeDefined();

      const session = sessionDb.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, payload!.sid))
        .get();
      expect(session).toBeDefined();
      const expectedTtl = 30 * 24 * 60 * 60 * 1000;
      const actualTtl = session!.expiresAt.getTime() - session!.createdAt.getTime();
      expect(Math.abs(actualTtl - expectedTtl)).toBeLessThan(5000);
    });

    it('parses forwarded IP from x-forwarded-for header string and array', async () => {
      // Test string x-forwarded-for
      const resString = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        },
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const sidString = sessionApp.jwt.decode<{ sid: string }>(resString.json().accessToken)?.sid;
      const sessString = sessionDb.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sidString!))
        .get();
      expect(sessString?.ipAddress).toBe('203.0.113.195');

      // Test array x-forwarded-for (simulated via raw headers)
      const resArray = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          // eslint-disable-next-line sonarjs/no-hardcoded-ip
          'x-forwarded-for': ['198.51.100.10', '10.0.0.1'] as unknown as string,
        },
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const sidArray = sessionApp.jwt.decode<{ sid: string }>(resArray.json().accessToken)?.sid;
      const sessArray = sessionDb.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sidArray!))
        .get();
      expect(sessArray?.ipAddress).toBe('198.51.100.10');
    });

    it('rejects access token when session is revoked from database', async () => {
      const loginRes = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const { accessToken } = loginRes.json();
      const sid = sessionApp.jwt.decode<{ sid: string }>(accessToken)!.sid;

      // Delete session
      sessionDb.db.delete(sessions).where(eq(sessions.id, sid)).run();

      const meRes = await sessionApp.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(meRes.statusCode).toBe(401);
      const body = meRes.json();
      expect(body.errorCode).toBe('AUTH_SESSION_INVALID');
      expect(body.message).toContain('Session is invalid or expired');
    });

    it('rejects access token when session is expired in database', async () => {
      const loginRes = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const { accessToken } = loginRes.json();
      const sid = sessionApp.jwt.decode<{ sid: string }>(accessToken)!.sid;

      // Set expiresAt to the past
      sessionDb.db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(sessions.id, sid))
        .run();

      const meRes = await sessionApp.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(meRes.statusCode).toBe(401);
      const body = meRes.json();
      expect(body.errorCode).toBe('AUTH_SESSION_INVALID');
    });

    it('updates lastActiveAt in authenticate when more than 60 seconds have elapsed', async () => {
      const loginRes = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const { accessToken } = loginRes.json();
      const sid = sessionApp.jwt.decode<{ sid: string }>(accessToken)!.sid;

      const oldTime = new Date(Date.now() - 120_000);
      sessionDb.db
        .update(sessions)
        .set({ lastActiveAt: oldTime })
        .where(eq(sessions.id, sid))
        .run();

      const meRes = await sessionApp.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(meRes.statusCode).toBe(200);
      const updatedSess = sessionDb.db.select().from(sessions).where(eq(sessions.id, sid)).get();
      expect(updatedSess!.lastActiveAt.getTime()).toBeGreaterThan(oldTime.getTime());
    });

    it('rejects refresh token when session is revoked or expired', async () => {
      const loginRes = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const { refreshToken } = loginRes.json();
      const sid = sessionApp.jwt.decode<{ sid: string }>(refreshToken)!.sid;

      // Revoke session
      sessionDb.db.delete(sessions).where(eq(sessions.id, sid)).run();

      const refreshRes = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(refreshRes.statusCode).toBe(401);
      const body = refreshRes.json();
      expect(body.errorCode).toBe('AUTH_SESSION_EXPIRED');
    });

    it('updates lastActiveAt during token refresh if throttled window passed', async () => {
      const loginRes = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: 'admin', password: 'admin' },
      });
      const { refreshToken } = loginRes.json();
      const sid = sessionApp.jwt.decode<{ sid: string }>(refreshToken)!.sid;

      const oldTime = new Date(Date.now() - 120_000);
      sessionDb.db
        .update(sessions)
        .set({ lastActiveAt: oldTime })
        .where(eq(sessions.id, sid))
        .run();

      const refreshRes = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(refreshRes.statusCode).toBe(200);
      const updatedSess = sessionDb.db.select().from(sessions).where(eq(sessions.id, sid)).get();
      expect(updatedSess!.lastActiveAt.getTime()).toBeGreaterThan(oldTime.getTime());
    });
  });
});
