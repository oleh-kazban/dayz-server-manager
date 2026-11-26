import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { apiErrorResponseSchema, refreshResponseSchema } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase, sessions } from '@aegis/database';

import { signSession } from '../__fixtures__/session-token';
import { DEFAULT_TEST_PASSWORD, type InsertedUser, insertUser } from '../__fixtures__/users';
import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

describe('Auth Routes (/api/v1/auth)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let admin: InsertedUser;

  beforeAll(async () => {
    dbInstance = initDatabase({ dbPath: ':memory:' });
    admin = insertUser(dbInstance, { username: 'admin', email: 'admin@dsm.local' });
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
        payload: admin.credentials,
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
          password: DEFAULT_TEST_PASSWORD,
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
        payload: admin.credentials,
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
      expect(body.refreshToken).toBeDefined();
      expect(body.refreshToken).not.toBe(refreshToken);
      expect(body.expiresIn).toBe(900);
    });

    it('returns 401 if access token is passed instead of refresh token', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: admin.credentials,
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
      const ghostToken = signSession(app, {
        sub: '00000000-0000-0000-0000-000000000000',
        withoutUser: true,
      }).refreshToken;

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
        payload: admin.credentials,
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
        payload: admin.credentials,
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
      const ghostAccessToken = signSession(app, {
        sub: '00000000-0000-0000-0000-000000000000',
        withoutUser: true,
      }).accessToken;

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
        payload: { usernameOrEmail: 'admin', password: DEFAULT_TEST_PASSWORD },
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
    let sessionAdmin: InsertedUser;

    beforeAll(async () => {
      sessionDb = initDatabase({ dbPath: ':memory:' });
      sessionAdmin = insertUser(sessionDb, { username: 'admin' });
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
        payload: { ...sessionAdmin.credentials, rememberMe: true },
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

    it('records the socket address and ignores x-forwarded-for when TRUST_PROXY is unset (AC-11)', async () => {
      const res = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        remoteAddress: '192.0.2.9',
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
        payload: sessionAdmin.credentials,
      });
      const sid = sessionApp.jwt.decode<{ sid: string }>(res.json().accessToken)?.sid;
      const row = sessionDb.db.select().from(sessions).where(eq(sessions.id, sid!)).get();

      expect(row?.ipAddress).toBe('192.0.2.9');
    });

    it('rejects access token when session is revoked from database', async () => {
      const loginRes = await sessionApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: sessionAdmin.credentials,
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
        payload: sessionAdmin.credentials,
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
        payload: sessionAdmin.credentials,
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
        payload: sessionAdmin.credentials,
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
        payload: sessionAdmin.credentials,
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

async function buildRoleApp() {
  const dbInstance = initDatabase({ dbPath: ':memory:' });
  const app = buildApp({
    config: loadEnv({
      SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
      LOG_LEVEL: 'silent',
    }),
    db: dbInstance,
  });
  await app.ready();
  return { app, dbInstance };
}

describe.each(['root', 'setup'] as const)('Auth routes for a %s user (role model)', role => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let credentials: { usernameOrEmail: string; password: string };

  beforeAll(async () => {
    ({ app, dbInstance } = await buildRoleApp());
    ({ credentials } = insertUser(dbInstance, {
      role,
      username: `${role}-user`,
      password: 'role-pass-123',
    }));
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  it('login serializes the real role in the response and the token claim (AC-2, AC-8)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: credentials,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe(role);
    expect(app.jwt.decode<{ role: string }>(res.json().accessToken)?.role).toBe(role);
  });

  it('refresh issues an access token carrying the real role (AC-8)', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: credentials,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: login.json().refreshToken },
    });

    expect(res.statusCode).toBe(200);
    expect(app.jwt.decode<{ role: string }>(res.json().accessToken)?.role).toBe(role);
  });

  it('GET /me returns 200 with the real role (AC-2, AC-8, AC-11)', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: credentials,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${login.json().accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe(role);
  });
});

describe('GET /api/v1/auth/me with a role-less token (role model)', () => {
  it('stays allowed because the route is on the allowlist', async () => {
    const { app, dbInstance } = await buildRoleApp();
    try {
      insertUser(dbInstance, { role: 'root', id: 'role-model-root' });
      const token = signSession(app, {
        sub: 'role-model-root',
        tokenRole: null,
      }).accessToken;

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
    } finally {
      await app.close();
      dbInstance.close();
    }
  });
});

describe('Setup account sign-in and session cap (AC-10)', () => {
  const MINUTE = 60_000;
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;

  beforeAll(async () => {
    ({ app, dbInstance } = await buildRoleApp());
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  /** Second resolution, like `users.createdAt`, so the expected cap is exact. */
  const secondsAgo = (ms: number) => new Date(Math.floor((Date.now() - ms) / 1000) * 1000);
  const login = (payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: '/api/v1/auth/login', payload });
  const sessionOf = (token: string) => {
    const sid = app.jwt.decode<{ sid: string }>(token)?.sid ?? '';
    return dbInstance.db.select().from(sessions).where(eq(sessions.id, sid)).get();
  };

  it('caps the session at creation plus 60 minutes and ignores rememberMe', async () => {
    const createdAt = secondsAgo(50 * MINUTE);
    const setup = insertUser(dbInstance, { role: 'setup', createdAt });

    const res = await login({ ...setup.credentials, rememberMe: true });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('setup');
    expect(sessionOf(res.json().accessToken)?.expiresAt.getTime()).toBe(
      createdAt.getTime() + 60 * MINUTE,
    );
  });

  it('caps the 7 day ttl of a freshly created setup account at 60 minutes', async () => {
    const createdAt = secondsAgo(0);
    const setup = insertUser(dbInstance, { role: 'setup', createdAt });

    const res = await login(setup.credentials);

    expect(sessionOf(res.json().accessToken)?.expiresAt.getTime()).toBe(
      createdAt.getTime() + 60 * MINUTE,
    );
  });

  it('caps the refresh token lifetime at the session cap', async () => {
    const createdAt = secondsAgo(50 * MINUTE);
    const setup = insertUser(dbInstance, { role: 'setup', createdAt });

    const res = await login({ ...setup.credentials, rememberMe: true });

    const refresh = app.jwt.decode<{ exp: number; iat: number }>(res.json().refreshToken);
    const capSeconds = (createdAt.getTime() + 60 * MINUTE) / 1000;
    expect(refresh?.exp).toBeLessThanOrEqual(capSeconds);
    expect(refresh?.exp).toBeGreaterThan(capSeconds - 5);
  });

  it.each([
    ['root', 7 * 24 * 3600],
    ['admin', 7 * 24 * 3600],
  ] as const)('leaves the %s refresh token at the normal 7 day lifetime', async (role, seconds) => {
    const user = insertUser(dbInstance, { role });

    const res = await login(user.credentials);

    const refresh = app.jwt.decode<{ exp: number; iat: number }>(res.json().refreshToken);
    expect((refresh?.exp ?? 0) - (refresh?.iat ?? 0)).toBe(seconds);
  });

  it('answers 401 AUTH_SETUP_SESSION_EXPIRED and creates no session for an expired account', async () => {
    const setup = insertUser(dbInstance, { role: 'setup', createdAt: secondsAgo(2 * 60 * MINUTE) });

    const res = await login(setup.credentials);

    expect(res.statusCode).toBe(401);
    expect(res.json().errorCode).toBe('AUTH_SETUP_SESSION_EXPIRED');
    expect(
      dbInstance.db.select().from(sessions).where(eq(sessions.userId, setup.id)).all(),
    ).toHaveLength(0);
  });

  it('treats exactly 60 minutes as expired and 59 minutes as valid', async () => {
    const expired = insertUser(dbInstance, { role: 'setup', createdAt: secondsAgo(60 * MINUTE) });
    const valid = insertUser(dbInstance, { role: 'setup', createdAt: secondsAgo(59 * MINUTE) });

    expect((await login(expired.credentials)).statusCode).toBe(401);
    expect((await login(valid.credentials)).statusCode).toBe(200);
  });

  it('gives no expiry hint for a wrong password on an expired account', async () => {
    const setup = insertUser(dbInstance, { role: 'setup', createdAt: secondsAgo(2 * 60 * MINUTE) });

    const res = await login({ usernameOrEmail: setup.username, password: 'wrong-password' });

    expect(res.statusCode).toBe(401);
    expect(res.json().errorCode).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('rejects refresh and access once the cap time has passed', async () => {
    const setup = insertUser(dbInstance, { role: 'setup', createdAt: secondsAgo(10 * MINUTE) });
    const res = await login(setup.credentials);
    const sid = app.jwt.decode<{ sid: string }>(res.json().accessToken)?.sid ?? '';
    dbInstance.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.id, sid))
      .run();

    const refresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: res.json().refreshToken },
    });
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${res.json().accessToken}` },
    });

    expect(refresh.statusCode).toBe(401);
    expect(refresh.json().errorCode).toBe('AUTH_SESSION_EXPIRED');
    expect(me.statusCode).toBe(401);
    expect(me.json().errorCode).toBe('AUTH_SESSION_INVALID');
  });
});

describe('Sign-out, refresh rotation and strict tokens', () => {
  const WINDOW_MS = 60_000;
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;

  beforeEach(async () => {
    ({ app, dbInstance } = await buildRoleApp());
  });

  afterEach(async () => {
    await app.close();
    dbInstance.close();
  });

  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
  const logout = (token?: string) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: token ? bearer(token) : {},
    });
  const refresh = (refreshToken: string) =>
    app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken } });
  const me = (token: string) =>
    app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: bearer(token) });
  const sessionRow = (sid: string) =>
    dbInstance.sqlite
      .prepare(
        'SELECT refresh_jti, previous_refresh_jti, refresh_rotated_at, expires_at FROM sessions WHERE id = ?',
      )
      .get(sid) as
      | {
          refresh_jti: string | null;
          previous_refresh_jti: string | null;
          refresh_rotated_at: number | null;
          expires_at: number;
        }
      | undefined;
  const jtiOf = (token: string) => app.jwt.decode<{ jti?: string }>(token)?.jti;
  const setRotatedAt = (sid: string, ms: number) =>
    dbInstance.sqlite
      .prepare('UPDATE sessions SET refresh_rotated_at = ? WHERE id = ?')
      .run(ms, sid);

  describe('POST /api/v1/auth/logout', () => {
    it('answers 204 with no body and ends the session: both tokens are rejected afterwards (AC-1)', async () => {
      const { accessToken, refreshToken, sid } = signSession(app);

      const res = await logout(accessToken);

      expect(res.statusCode).toBe(204);
      expect(res.body).toBe('');
      expect(sessionRow(sid)).toBeUndefined();
      const afterAccess = await me(accessToken);
      expect(afterAccess.statusCode).toBe(401);
      expect(afterAccess.json().errorCode).toBe('AUTH_SESSION_INVALID');
      const afterRefresh = await refresh(refreshToken);
      expect(afterRefresh.statusCode).toBe(401);
      expect(afterRefresh.json().errorCode).toBe('AUTH_SESSION_EXPIRED');
    });

    it('removes the session from the sessions list and keeps the other sessions (AC-1)', async () => {
      const current = signSession(app, { sub: 'two-sessions' });
      const other = signSession(app, { sub: 'two-sessions' });

      await logout(current.accessToken);

      const list = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sessions',
        headers: bearer(other.accessToken),
      });
      const ids = list.json().sessions.map((s: { id: string }) => s.id);
      expect(ids).toEqual([other.sid]);
      expect((await me(other.accessToken)).statusCode).toBe(200);
    });

    it('works with the tokens of a real sign-in (AC-1)', async () => {
      const user = insertUser(dbInstance, { username: 'real-login' });
      const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: user.credentials,
      });
      const { accessToken, refreshToken } = login.json();

      expect((await logout(accessToken)).statusCode).toBe(204);

      expect((await me(accessToken)).statusCode).toBe(401);
      expect((await refresh(refreshToken)).statusCode).toBe(401);
    });

    it('answers 204 again for a token whose session is already gone (AC-2)', async () => {
      const { accessToken } = signSession(app);
      await logout(accessToken);

      const second = await logout(accessToken);

      expect(second.statusCode).toBe(204);
      expect(second.body).toBe('');
    });

    it('answers 204 when the session row was removed by someone else (AC-2)', async () => {
      const { accessToken, sid } = signSession(app);
      dbInstance.sqlite.prepare('DELETE FROM sessions WHERE id = ?').run(sid);

      expect((await logout(accessToken)).statusCode).toBe(204);
    });

    it('answers 401 AUTH_TOKEN_MISSING_OR_INVALID without a token (AC-2)', async () => {
      const res = await logout();

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_TOKEN_MISSING_OR_INVALID');
    });

    it('answers 401 AUTH_TOKEN_MISSING_OR_INVALID for a malformed token (AC-2)', async () => {
      const res = await logout('bogus.token.value');

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_TOKEN_MISSING_OR_INVALID');
    });

    it('answers 401 AUTH_TOKEN_TYPE_INVALID for a refresh token and keeps the session (AC-2)', async () => {
      const { refreshToken, sid } = signSession(app);

      const res = await logout(refreshToken);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_TOKEN_TYPE_INVALID');
      expect(sessionRow(sid)).toBeDefined();
    });

    it('answers 401 AUTH_SESSION_INVALID for an access token without sid (AC-7)', async () => {
      const { userId } = signSession(app);
      const sidLess = app.jwt.sign({ sub: userId, role: 'admin', type: 'access' } as never);

      const res = await logout(sidLess);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_SESSION_INVALID');
    });

    it('deletes only a session that belongs to the caller (AC-1)', async () => {
      const victim = signSession(app, { sub: 'victim' });
      const attacker = signSession(app, { sub: 'attacker' });
      const forged = app.jwt.sign({
        sub: attacker.userId,
        role: 'admin',
        type: 'access',
        sid: victim.sid,
      });

      const res = await logout(forged);

      expect(res.statusCode).toBe(204);
      expect(sessionRow(victim.sid)).toBeDefined();
      expect((await me(victim.accessToken)).statusCode).toBe(200);
    });

    it('lets a setup user sign out (AC-2)', async () => {
      const { accessToken, sid } = signSession(app, { role: 'setup' });

      expect((await logout(accessToken)).statusCode).toBe(204);
      expect(sessionRow(sid)).toBeUndefined();
    });
  });

  describe('POST /api/v1/auth/refresh rotation', () => {
    it('returns a different refresh token that carries the same session and a fresh identifier (AC-4)', async () => {
      const { refreshToken, sid, jti } = signSession(app);

      const res = await refresh(refreshToken);

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(refreshResponseSchema.safeParse(body).success).toBe(true);
      expect(body.refreshToken).not.toBe(refreshToken);
      const claims = app.jwt.decode<{ sid: string; type: string; jti: string }>(body.refreshToken);
      expect(claims).toMatchObject({ sid, type: 'refresh' });
      expect(claims?.jti).toBeTruthy();
      expect(claims?.jti).not.toBe(jti);
    });

    it('stores the new identifier and the previous one on the session (AC-4)', async () => {
      const { refreshToken, sid, jti } = signSession(app);

      const body = (await refresh(refreshToken)).json();

      const row = sessionRow(sid);
      expect(row?.refresh_jti).toBe(jtiOf(body.refreshToken));
      expect(row?.previous_refresh_jti).toBe(jti);
      expect(row?.refresh_rotated_at).toBeGreaterThan(0);
    });

    it('accepts the new refresh token and rotates it again (AC-4)', async () => {
      const { refreshToken } = signSession(app);
      const first = (await refresh(refreshToken)).json();

      const second = await refresh(first.refreshToken);

      expect(second.statusCode).toBe(200);
      expect(second.json().refreshToken).not.toBe(first.refreshToken);
    });

    it('gives the new access token a working session (AC-4)', async () => {
      const { refreshToken } = signSession(app);

      const body = (await refresh(refreshToken)).json();

      expect((await me(body.accessToken)).statusCode).toBe(200);
    });

    it('gives the new refresh token the expiry of the session (AC-4)', async () => {
      const { refreshToken, sid } = signSession(app, { ttlMs: 3 * 24 * 3_600_000 });

      const body = (await refresh(refreshToken)).json();

      const exp = app.jwt.decode<{ exp: number }>(body.refreshToken)?.exp ?? 0;
      expect(Math.abs(exp - (sessionRow(sid)?.expires_at ?? 0))).toBeLessThanOrEqual(2);
    });

    it('answers the previous token inside the window with the current token and changes nothing (AC-5)', async () => {
      const { refreshToken, sid } = signSession(app);
      const rotated = (await refresh(refreshToken)).json();
      const before = sessionRow(sid);

      const again = await refresh(refreshToken);

      expect(again.statusCode).toBe(200);
      expect(jtiOf(again.json().refreshToken)).toBe(jtiOf(rotated.refreshToken));
      expect(sessionRow(sid)).toEqual(before);
    });

    it('lets several holders of the previous token converge on one token (AC-5)', async () => {
      const { refreshToken } = signSession(app);
      const rotated = (await refresh(refreshToken)).json();

      const second = await refresh(refreshToken);
      const third = await refresh(refreshToken);

      expect(second.statusCode).toBe(200);
      expect(third.statusCode).toBe(200);
      expect(jtiOf(second.json().refreshToken)).toBe(jtiOf(rotated.refreshToken));
      expect(jtiOf(third.json().refreshToken)).toBe(jtiOf(rotated.refreshToken));
    });

    it('rejects the previous token after the window, deletes the session and the current token stops working (AC-5)', async () => {
      const { refreshToken, sid } = signSession(app);
      const rotated = (await refresh(refreshToken)).json();
      setRotatedAt(sid, Date.now() - WINDOW_MS - 1_000);

      const res = await refresh(refreshToken);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_SESSION_EXPIRED');
      expect(sessionRow(sid)).toBeUndefined();
      expect((await refresh(rotated.refreshToken)).statusCode).toBe(401);
      expect((await me(rotated.accessToken)).statusCode).toBe(401);
    });

    it('deletes the session for a signed refresh token with an unknown identifier (AC-6)', async () => {
      const { userId, sid, accessToken } = signSession(app);
      const forged = app.jwt.sign({
        sub: userId,
        type: 'refresh',
        sid,
        jti: 'never-issued',
      } as never);

      const res = await refresh(forged);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_SESSION_EXPIRED');
      expect(sessionRow(sid)).toBeUndefined();
      expect((await me(accessToken)).statusCode).toBe(401);
    });

    it('answers a token two rotations back as reuse (AC-6)', async () => {
      const { refreshToken, sid } = signSession(app);
      const first = (await refresh(refreshToken)).json();
      await refresh(first.refreshToken);

      const res = await refresh(refreshToken);

      expect(res.statusCode).toBe(401);
      expect(sessionRow(sid)).toBeUndefined();
    });

    it('answers an expired session with AUTH_SESSION_EXPIRED (AC-6)', async () => {
      const { refreshToken, sid } = signSession(app);
      dbInstance.sqlite.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(1, sid);

      const res = await refresh(refreshToken);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_SESSION_EXPIRED');
    });

    it('keeps answering AUTH_USER_NOT_FOUND when the user is gone (AC-4)', async () => {
      const { refreshToken } = signSession(app, { withoutUser: true });

      const res = await refresh(refreshToken);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_USER_NOT_FOUND');
    });

    it('leaves the other sessions of the user alone on a reuse (AC-6)', async () => {
      const first = signSession(app, { sub: 'two-devices' });
      const second = signSession(app, { sub: 'two-devices' });
      const forged = app.jwt.sign({
        sub: first.userId,
        type: 'refresh',
        sid: first.sid,
        jti: 'never-issued',
      } as never);

      await refresh(forged);

      expect(sessionRow(second.sid)).toBeDefined();
    });
  });

  describe('tokens without sid or jti (AC-7)', () => {
    it('rejects an access token without sid on a protected route', async () => {
      const { userId } = signSession(app);
      const token = app.jwt.sign({ sub: userId, role: 'admin', type: 'access' } as never);

      const res = await me(token);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_SESSION_INVALID');
    });

    it('rejects an access token without sid on the stream ticket route', async () => {
      const { userId } = signSession(app);
      const token = app.jwt.sign({ sub: userId, role: 'admin', type: 'access' } as never);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/realtime/ticket',
        headers: bearer(token),
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_SESSION_INVALID');
    });

    it('rejects a refresh token without sid', async () => {
      const { userId, sid } = signSession(app);
      const token = app.jwt.sign({ sub: userId, type: 'refresh', jti: 'J1' } as never);

      const res = await refresh(token);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_REFRESH_TOKEN_INVALID');
      expect(sessionRow(sid)).toBeDefined();
    });

    it('rejects a refresh token without jti and keeps the session', async () => {
      const { userId, sid } = signSession(app);
      const token = app.jwt.sign({ sub: userId, type: 'refresh', sid } as never);

      const res = await refresh(token);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_REFRESH_TOKEN_INVALID');
      expect(sessionRow(sid)).toBeDefined();
    });
  });
});
