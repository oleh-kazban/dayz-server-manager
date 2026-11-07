import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { apiErrorResponseSchema } from '@dsm/api-contracts';
import { type DatabaseInstance, initDatabase, sessions, verifyPassword } from '@dsm/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

describe('Profile Routes (/api/v1/profile & /api/v1/auth/profile)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let userAccessToken: string;
  let userSid: string;
  let userId: string;

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

    // Login as default admin to obtain a valid access token with stateful session
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        usernameOrEmail: 'admin',
        password: 'admin',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody = loginRes.json();
    userAccessToken = loginBody.accessToken;
    userId = loginBody.user.id;

    const payload = app.jwt.decode<{ sid: string }>(userAccessToken);
    userSid = payload?.sid ?? '';
    expect(userSid).toBeTruthy();
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  describe('GET /api/v1/profile', () => {
    it('returns 200 and operator profile for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(userId);
      expect(body.username).toBe('admin');
      expect(body.role).toBe('admin');
      expect(body.timezone).toBe('UTC');
      expect(body.timeFormat).toBe('24h');
      expect(body.createdAt).toBeDefined();
    });

    it('returns 401 when unauthenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_TOKEN_MISSING_OR_INVALID');
    });

    it('falls back to null for optional fields when database contains null values', async () => {
      // Set email, display_name, and last_login_at to NULL directly via SQLite
      dbInstance.sqlite
        .prepare(
          'UPDATE users SET display_name = NULL, email = NULL, last_login_at = NULL WHERE id = ?',
        )
        .run(userId);

      const getRes = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${userAccessToken}` },
      });

      expect(getRes.statusCode).toBe(200);
      const getBody = getRes.json();
      expect(getBody.displayName).toBeNull();
      expect(getBody.email).toBeNull();
      expect(getBody.lastLoginAt).toBeNull();

      // Set non-null last_login_at and test PATCH response with displayName null and non-null last_login_at
      dbInstance.sqlite
        .prepare('UPDATE users SET last_login_at = ?, display_name = NULL WHERE id = ?')
        .run(Date.now(), userId);

      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: { authorization: `Bearer ${userAccessToken}` },
        payload: { email: 'fallback@dsm.local' },
      });

      expect(patchRes.statusCode).toBe(200);
      const patchBody = patchRes.json();
      expect(patchBody.displayName).toBeNull();
      expect(patchBody.email).toBe('fallback@dsm.local');
      expect(patchBody.lastLoginAt).toBeDefined();
    });

    it('returns 401 when token subject does not exist in database', async () => {
      const ghostToken = app.jwt.sign(
        {
          sub: '99999999-9999-9999-9999-999999999999',
          role: 'viewer',
          type: 'access',
        },
        { expiresIn: '15m' },
      );

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${ghostToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.errorCode).toBe('AUTH_USER_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/profile', () => {
    it('updates displayName, email, timezone, and timeFormat successfully', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          displayName: 'Lead Operator',
          email: 'operator@dsm.local',
          timezone: 'America/New_York',
          timeFormat: '12h',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.displayName).toBe('Lead Operator');
      expect(body.email).toBe('operator@dsm.local');
      expect(body.timezone).toBe('America/New_York');
      expect(body.timeFormat).toBe('12h');
    });

    it('clears email when set to empty string', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          email: '',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.email).toBeNull();
    });

    it('accepts empty update object as a no-op update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.username).toBe('admin');
    });

    it('rejects invalid email with 400 VALIDATION_FAILED', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          email: 'not-a-valid-email',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.errorCode).toBe('VALIDATION_FAILED');
    });

    it('rejects unrecognized IANA timezone with 400 VALIDATION_FAILED', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          timezone: 'Mars/Olympus_Mons',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      expect(body.message).toContain('Invalid IANA timezone identifier');
    });

    it('enforces GUARD-03: username and role cannot be mutated', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          displayName: 'Legit Operator',
          username: 'hacked_admin',
          role: 'viewer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.displayName).toBe('Legit Operator');
      expect(body.username).toBe('admin');
      expect(body.role).toBe('admin');

      // Verify directly in DB
      const dbUser = dbInstance.sqlite
        .prepare('SELECT username, role FROM users WHERE id = ?')
        .get(userId) as { username: string; role: string };
      expect(dbUser.username).toBe('admin');
      expect(dbUser.role).toBe('admin');
    });

    it('returns 401 when token subject does not exist in database during PATCH', async () => {
      const ghostToken = app.jwt.sign(
        {
          sub: '99999999-9999-9999-9999-999999999998',
          role: 'viewer',
          type: 'access',
        },
        { expiresIn: '15m' },
      );

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/profile',
        headers: {
          authorization: `Bearer ${ghostToken}`,
        },
        payload: { displayName: 'Ghost' },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.errorCode).toBe('AUTH_USER_NOT_FOUND');
    });

    it('returns 401 if user is missing immediately after update in PATCH', async () => {
      // Create a dedicated user to avoid mutating admin
      const tempUserId = 'temp-trigger-user-uuid';
      const now = new Date();
      dbInstance.sqlite
        .prepare(
          `
        INSERT INTO users (id, username, password_hash, role, timezone, time_format, created_at)
        VALUES (?, 'triggeruser', 'dummyhash', 'viewer', 'UTC', '24h', ?)
      `,
        )
        .run(tempUserId, now.getTime());

      const tempToken = app.jwt.sign(
        { sub: tempUserId, role: 'viewer', type: 'access' },
        { expiresIn: '15m' },
      );

      // Create a temporary BEFORE UPDATE trigger that deletes the user
      dbInstance.sqlite.exec(`
        CREATE TRIGGER delete_user_on_update
        BEFORE UPDATE ON users
        FOR EACH ROW
        WHEN NEW.id = '${tempUserId}'
        BEGIN
          DELETE FROM users WHERE id = '${tempUserId}';
        END;
      `);

      try {
        const response = await app.inject({
          method: 'PATCH',
          url: '/api/v1/profile',
          headers: {
            authorization: `Bearer ${tempToken}`,
          },
          payload: { displayName: 'Will disappear' },
        });

        expect(response.statusCode).toBe(401);
        const body = response.json();
        expect(body.errorCode).toBe('AUTH_USER_NOT_FOUND');
      } finally {
        dbInstance.sqlite.exec('DROP TRIGGER IF EXISTS delete_user_on_update;');
      }
    });
  });

  describe('POST /api/v1/profile/change-password', () => {
    it('rejects payload when password confirmation does not match', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/change-password',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          currentPassword: 'admin',
          newPassword: 'newSuperPassword1!',
          confirmPassword: 'differentPassword2@',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      expect(body.fieldErrors?.confirmPassword).toBeDefined();
    });

    it('rejects passwords failing complexity rules or containing whitespace', async () => {
      // Test missing number
      const passWithoutDigits = 'AllLettersSpecial!';
      const resNoNumber = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/change-password',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          currentPassword: 'admin',
          newPassword: passWithoutDigits,
          confirmPassword: passWithoutDigits,
        },
      });

      expect(resNoNumber.statusCode).toBe(400);
      expect(resNoNumber.json().message).toContain('Password must contain at least 1 number');

      // Test containing whitespace
      const resWhitespace = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/change-password',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          currentPassword: 'admin',
          newPassword: 'Str0ng! Pass1',
          confirmPassword: 'Str0ng! Pass1',
        },
      });

      expect(resWhitespace.statusCode).toBe(400);
      expect(resWhitespace.json().message).toContain('Whitespace is not permitted in passwords');
    });

    it('enforces GUARD-01: wrong currentPassword refuses mutation with 400 AUTH_PASSWORD_MISMATCH', async () => {
      const beforeUser = dbInstance.sqlite
        .prepare('SELECT password_hash FROM users WHERE id = ?')
        .get(userId) as { password_hash: string };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/change-password',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          currentPassword: 'wrong-current-password',
          newPassword: 'validNewPassword1!',
          confirmPassword: 'validNewPassword1!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.errorCode).toBe('AUTH_PASSWORD_MISMATCH');

      // Assert zero mutation to password hash
      const afterUser = dbInstance.sqlite
        .prepare('SELECT password_hash FROM users WHERE id = ?')
        .get(userId) as { password_hash: string };
      expect(afterUser.password_hash).toBe(beforeUser.password_hash);
    });

    it('rotates password, updates DB hash, and revokes other sessions', async () => {
      // Create a secondary remote session for the same user
      const remoteSid = 'remote-device-session-uuid';
      const now = new Date();
      dbInstance.db
        .insert(sessions)
        .values({
          id: remoteSid,
          userId,
          userAgent: 'Mobile Safari on iOS',
          ipAddress: '127.0.0.1',
          lastActiveAt: now,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 86400000),
        })
        .run();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/change-password',
        headers: {
          authorization: `Bearer ${userAccessToken}`,
        },
        payload: {
          currentPassword: 'admin',
          newPassword: 'BrandNewSecurePassword123!',
          confirmPassword: 'BrandNewSecurePassword123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);

      // Verify new password verifies against stored hash
      const updatedUser = dbInstance.sqlite
        .prepare('SELECT password_hash FROM users WHERE id = ?')
        .get(userId) as { password_hash: string };
      expect(verifyPassword('BrandNewSecurePassword123!', updatedUser.password_hash)).toBe(true);

      // Verify other session was automatically revoked while current session remained active (R-01)
      const remainingSessions = dbInstance.sqlite
        .prepare('SELECT id FROM sessions WHERE user_id = ?')
        .all(userId) as { id: string }[];
      const remainingIds = remainingSessions.map(s => s.id);
      expect(remainingIds).toContain(userSid);
      expect(remainingIds).not.toContain(remoteSid);
    });

    it('rotates password when token does not have sid claim without session deletion', async () => {
      const tokenWithoutSid = app.jwt.sign(
        { sub: userId, role: 'admin', type: 'access' },
        { expiresIn: '15m' },
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/change-password',
        headers: {
          authorization: `Bearer ${tokenWithoutSid}`,
        },
        payload: {
          currentPassword: 'BrandNewSecurePassword123!',
          newPassword: 'EvenNewerSecurePassword456@',
          confirmPassword: 'EvenNewerSecurePassword456@',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });

    it('returns 401 when token subject does not exist in database during change password', async () => {
      const ghostToken = app.jwt.sign(
        {
          sub: '99999999-9999-9999-9999-999999999997',
          role: 'viewer',
          type: 'access',
        },
        { expiresIn: '15m' },
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/profile/change-password',
        headers: {
          authorization: `Bearer ${ghostToken}`,
        },
        payload: {
          currentPassword: 'admin',
          newPassword: 'SomePassword123!',
          confirmPassword: 'SomePassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.errorCode).toBe('AUTH_USER_NOT_FOUND');
    });
  });
});
