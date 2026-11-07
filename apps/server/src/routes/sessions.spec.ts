import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { apiErrorResponseSchema } from '@dsm/api-contracts';
import { type DatabaseInstance, hashPassword, initDatabase, sessions, users } from '@dsm/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

describe('Sessions Routes (/api/v1/auth/sessions)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;

  let user1Id: string;
  let user1Token: string;
  let user1CurrentSid: string;
  let user1RemoteSid: string;

  let user2Id: string;
  let user2Token: string;
  let user2Sid: string;

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

    // User 1 login (admin)
    const login1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
      payload: { usernameOrEmail: 'admin', password: 'admin' },
    });
    user1Token = login1.json().accessToken;
    user1Id = login1.json().user.id;
    user1CurrentSid = app.jwt.decode<{ sid: string }>(user1Token)?.sid ?? '';

    // Create a secondary remote session for user 1
    user1RemoteSid = 'user1-remote-session-uuid';
    const now = new Date();
    dbInstance.db
      .insert(sessions)
      .values({
        id: user1RemoteSid,
        userId: user1Id,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
        ipAddress: '127.0.0.1',
        lastActiveAt: new Date(now.getTime() - 10000),
        createdAt: now,
        expiresAt: new Date(now.getTime() + 86400000),
      })
      .run();

    // Create user 2
    user2Id = 'user-2-uuid-test';
    dbInstance.db
      .insert(users)
      .values({
        id: user2Id,
        username: 'user2',
        passwordHash: hashPassword('user2pass1!'),
        role: 'viewer',
        timezone: 'UTC',
        timeFormat: '24h',
        createdAt: now,
      })
      .run();

    const login2 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { usernameOrEmail: 'user2', password: 'user2pass1!' },
    });
    user2Token = login2.json().accessToken;
    user2Sid = app.jwt.decode<{ sid: string }>(user2Token)?.sid ?? '';
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  describe('GET /api/v1/auth/sessions', () => {
    it('lists active unexpired sessions with isCurrent flags', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sessions',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.totalCount).toBe(2);
      expect(body.sessions).toHaveLength(2);

      const current = body.sessions.find((s: { id: string }) => s.id === user1CurrentSid);
      expect(current).toBeDefined();
      expect(current.isCurrent).toBe(true);
      expect(current.deviceSummary).toBe('Chrome on Windows');

      const remote = body.sessions.find((s: { id: string }) => s.id === user1RemoteSid);
      expect(remote).toBeDefined();
      expect(remote.isCurrent).toBe(false);
      expect(remote.deviceSummary).toBe('Mobile Safari on iOS');
    });

    it('does not return expired sessions', async () => {
      const expiredSid = 'user1-expired-session-uuid';
      const past = new Date(Date.now() - 3600000);
      dbInstance.db
        .insert(sessions)
        .values({
          id: expiredSid,
          userId: user1Id,
          userAgent: 'Old Browser',
          ipAddress: '127.0.0.1',
          lastActiveAt: past,
          createdAt: new Date(past.getTime() - 86400000),
          expiresAt: past,
        })
        .run();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sessions',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const sessionIds = body.sessions.map((s: { id: string }) => s.id);
      expect(sessionIds).not.toContain(expiredSid);
    });

    it('returns null for userAgent and ipAddress when session record has null fields', async () => {
      const nullFieldsSid = 'user2-null-fields-session';
      const now = new Date();
      dbInstance.db
        .insert(sessions)
        .values({
          id: nullFieldsSid,
          userId: user2Id,
          userAgent: null,
          ipAddress: null,
          lastActiveAt: now,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 86400000),
        })
        .run();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sessions',
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const sess = body.sessions.find((s: { id: string }) => s.id === nullFieldsSid);
      expect(sess).toBeDefined();
      expect(sess.userAgent).toBeNull();
      expect(sess.ipAddress).toBeNull();
      expect(sess.deviceSummary).toBe('Unknown Device');
    });
  });

  describe('DELETE /api/v1/auth/sessions/:id', () => {
    it('enforces GUARD-02: returns 404 and does not delete when attempting to revoke another user session (Anti-IDOR)', async () => {
      // User 1 tries to delete User 2's session
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/auth/sessions/${user2Sid}`,
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_SESSION_NOT_FOUND');

      // Verify User 2's session is still intact in the database
      const user2Session = dbInstance.sqlite
        .prepare('SELECT id FROM sessions WHERE id = ?')
        .get(user2Sid);
      expect(user2Session).toBeDefined();
    });

    it('returns 404 when session ID does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/sessions/non-existent-session-id',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.errorCode).toBe('AUTH_SESSION_NOT_FOUND');
    });

    it('successfully revokes an owned session', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/auth/sessions/${user1RemoteSid}`,
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('revoked successfully');

      // Verify deleted in database
      const check = dbInstance.sqlite
        .prepare('SELECT id FROM sessions WHERE id = ?')
        .get(user1RemoteSid);
      expect(check).toBeUndefined();
    });
  });

  describe('POST /api/v1/auth/sessions/revoke-others', () => {
    it('revokes all non-current sessions for authenticated user and keeps current session active', async () => {
      // Seed 2 extra sessions for user 1
      const now = new Date();
      dbInstance.db
        .insert(sessions)
        .values({
          id: 'user1-extra-1',
          userId: user1Id,
          lastActiveAt: now,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 86400000),
        })
        .run();
      dbInstance.db
        .insert(sessions)
        .values({
          id: 'user1-extra-2',
          userId: user1Id,
          lastActiveAt: now,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 86400000),
        })
        .run();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sessions/revoke-others',
        headers: {
          authorization: `Bearer ${user1Token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.revokedCount).toBe(3);
      expect(body.message).toContain('Successfully revoked 3 other sessions');

      // Verify User 1 only has user1CurrentSid remaining
      const user1Sessions = dbInstance.sqlite
        .prepare('SELECT id FROM sessions WHERE user_id = ?')
        .all(user1Id) as { id: string }[];
      expect(user1Sessions).toHaveLength(1);
      expect(user1Sessions[0].id).toBe(user1CurrentSid);

      // Verify User 2's session was not affected
      const user2Session = dbInstance.sqlite
        .prepare('SELECT id FROM sessions WHERE id = ?')
        .get(user2Sid);
      expect(user2Session).toBeDefined();
    });

    it('returns 401 when token lacks sid claim', async () => {
      // Token without sid
      const tokenWithoutSid = app.jwt.sign(
        { sub: user1Id, role: 'admin', type: 'access' },
        { expiresIn: '15m' },
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sessions/revoke-others',
        headers: {
          authorization: `Bearer ${tokenWithoutSid}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.errorCode).toBe('AUTH_SESSION_INVALID');
    });

    it('formats singular session message when exactly 1 other session is revoked', async () => {
      // User 2 has nullFieldsSid as other session, plus their active session user2Sid
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sessions/revoke-others',
        headers: {
          authorization: `Bearer ${user2Token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.revokedCount).toBe(1);
      expect(body.message).toBe('Successfully revoked 1 other session');
    });
  });
});
