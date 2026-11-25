import type { FastifyInstance, FastifyRequest } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { UserRole } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase } from '@aegis/database';

import { loadEnv } from '../config/env';

import { buildApp } from './app';
import {
  ADMIN_FORBIDDEN_MESSAGE,
  enforceRoleGate,
  isAdminRole,
  requireAdmin,
  requireRoot,
  ROLE_GATE_OPEN_ROUTES,
  ROOT_FORBIDDEN_MESSAGE,
} from './role-guards';

/** Sets `request.user` from the x-test-role header so the guards run without `authenticate`. */
const fakeUser = async (request: FastifyRequest) => {
  const role = request.headers['x-test-role'];
  request.user = {
    sub: 'test-user',
    ...(typeof role === 'string' && role !== 'none' ? { role: role as UserRole } : {}),
  };
};

describe('role guards', () => {
  let app: FastifyInstance;
  let db: DatabaseInstance;
  const handler = vi.fn(async () => ({ ok: true }));

  beforeAll(async () => {
    db = initDatabase({ dbPath: ':memory:' });
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      }),
      db,
    });
    app.get('/throwaway/admin', { onRequest: [fakeUser, requireAdmin] }, handler);
    app.get('/throwaway/root', { onRequest: [fakeUser, requireRoot] }, handler);
    app.get('/throwaway/gate', { onRequest: [fakeUser, enforceRoleGate] }, handler);
    app.get('/throwaway/authenticated', { onRequest: [app.authenticate] }, handler);
    app.get('/throwaway/sse', { onRequest: [app.authenticateSse] }, handler);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    db.close();
  });

  const call = (url: string, role: string) => {
    handler.mockClear();
    return app.inject({ method: 'GET', url, headers: { 'x-test-role': role } });
  };
  const token = (role?: string) =>
    app.jwt.sign({ sub: 'test-user', type: 'access', ...(role ? { role } : {}) });
  const withToken = (url: string, role?: string) => {
    handler.mockClear();
    return app.inject({
      method: 'GET',
      url,
      headers: { authorization: `Bearer ${token(role)}` },
    });
  };

  describe('isAdminRole', () => {
    it.each([
      ['root', true],
      ['admin', true],
      ['setup', false],
      ['viewer', false],
      [undefined, false],
    ])('returns for %s -> %s', (role, expected) => {
      expect(isAdminRole(role as UserRole | undefined)).toBe(expected);
    });
  });

  describe('requireAdmin (AC-3)', () => {
    it.each(['root', 'admin'])('lets %s through to the handler', async role => {
      const res = await call('/throwaway/admin', role);
      expect(res.statusCode).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it.each(['setup', 'none', 'viewer'])(
      'replies 403 AUTH_FORBIDDEN_ADMIN_REQUIRED for role %s and skips the handler',
      async role => {
        const res = await call('/throwaway/admin', role);
        expect(res.statusCode).toBe(403);
        expect(res.json()).toEqual({
          statusCode: 403,
          error: 'Forbidden',
          errorCode: 'AUTH_FORBIDDEN_ADMIN_REQUIRED',
          message: ADMIN_FORBIDDEN_MESSAGE,
        });
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it('uses the generic administrator message', () => {
      expect(ADMIN_FORBIDDEN_MESSAGE).toBe(
        'Administrator privileges are required to perform this action.',
      );
    });
  });

  describe('requireRoot (AC-4)', () => {
    it('lets root through to the handler', async () => {
      const res = await call('/throwaway/root', 'root');
      expect(res.statusCode).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it.each(['admin', 'setup', 'none', 'viewer'])(
      'replies 403 AUTH_FORBIDDEN_ROOT_REQUIRED for role %s and skips the handler',
      async role => {
        const res = await call('/throwaway/root', role);
        expect(res.statusCode).toBe(403);
        expect(res.json()).toEqual({
          statusCode: 403,
          error: 'Forbidden',
          errorCode: 'AUTH_FORBIDDEN_ROOT_REQUIRED',
          message: ROOT_FORBIDDEN_MESSAGE,
        });
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it('uses the generic root message', () => {
      expect(ROOT_FORBIDDEN_MESSAGE).toBe('Root privileges are required to perform this action.');
    });
  });

  describe('enforceRoleGate on a route that is not allowlisted (AC-5)', () => {
    it.each(['root', 'admin'])('lets %s through', async role => {
      expect((await call('/throwaway/gate', role)).statusCode).toBe(200);
    });

    it.each(['setup', 'none', 'viewer'])(
      'denies role %s with AUTH_FORBIDDEN_ADMIN_REQUIRED',
      async role => {
        const res = await call('/throwaway/gate', role);
        expect(res.statusCode).toBe(403);
        expect(res.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
        expect(res.json().message).toBe(ADMIN_FORBIDDEN_MESSAGE);
        expect(handler).not.toHaveBeenCalled();
      },
    );
  });

  describe('authenticate runs the gate', () => {
    it.each(['root', 'admin'])('lets a %s token reach an authenticated-only route', async role => {
      expect((await withToken('/throwaway/authenticated', role)).statusCode).toBe(200);
    });

    it.each(['setup', undefined, 'viewer'])(
      'denies a token with role %s on a route that is not allowlisted',
      async role => {
        const res = await withToken('/throwaway/authenticated', role);
        expect(res.statusCode).toBe(403);
        expect(res.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it('still answers 401 for a missing token before the gate', async () => {
      const res = await app.inject({ method: 'GET', url: '/throwaway/authenticated' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('authenticateSse ticket branch (AC-6)', () => {
    it.each([['setup' as const], [undefined]])(
      'denies a ticket stored with role %s',
      async role => {
        const { ticket } = app.sseTickets.issue({ sub: 'x', role });
        handler.mockClear();

        const res = await app.inject({ method: 'GET', url: `/throwaway/sse?ticket=${ticket}` });

        expect(res.statusCode).toBe(403);
        expect(res.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
        expect(handler).not.toHaveBeenCalled();
      },
    );

    it.each(['root', 'admin'] as const)('accepts a ticket stored with role %s', async role => {
      const { ticket } = app.sseTickets.issue({ sub: 'x', role });
      expect(
        (await app.inject({ method: 'GET', url: `/throwaway/sse?ticket=${ticket}` })).statusCode,
      ).toBe(200);
    });

    it('denies a setup token on the header fallback', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/throwaway/sse',
        headers: { authorization: `Bearer ${token('setup')}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('ROLE_GATE_OPEN_ROUTES (AC-5, AC-8)', () => {
    it('is pinned to GET /api/v1/auth/me and POST /api/v1/setup/root', () => {
      expect([...ROLE_GATE_OPEN_ROUTES]).toEqual([
        'GET /api/v1/auth/me',
        'POST /api/v1/setup/root',
      ]);
    });
  });
});
