import type { FastifyInstance, RouteOptions } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { USER_ROLE_VALUES } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase } from '@aegis/database';

import { loadEnv } from '../config/env';
import { FakeProcessManager } from '../services/server/__fixtures__/fake-process-manager';

import { buildApp } from './app';
import { ADMIN_FORBIDDEN_MESSAGE, requireAdmin, ROLE_GATE_OPEN_ROUTES } from './role-guards';

const PUBLIC_ROUTES = [
  'GET /api/v1/health',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh',
];
const ADMIN_GUARDED_ROUTES = [
  'DELETE /api/v1/servers/:id',
  'DELETE /api/v1/servers/:id/mods/:modId',
  'GET /api/v1/servers/:id/config/server-dz',
  'GET /api/v1/servers/:id/config/server-dz/revisions',
  'GET /api/v1/servers/:id/config/server-dz/revisions/:revisionId',
  'GET /api/v1/servers/:id/launch-command',
  'GET /api/v1/settings/steam',
  'GET /api/v1/workshop/search',
  'PATCH /api/v1/servers/:id',
  'PATCH /api/v1/servers/:id/mods/:modId',
  'PATCH /api/v1/settings/steam',
  'POST /api/v1/servers',
  'POST /api/v1/servers/:id/config/battleye/sync',
  'POST /api/v1/servers/:id/config/server-dz/bootstrap',
  'POST /api/v1/servers/:id/config/server-dz/lock',
  'POST /api/v1/servers/:id/config/server-dz/lock/heartbeat',
  'POST /api/v1/servers/:id/config/server-dz/lock/release',
  'POST /api/v1/servers/:id/config/server-dz/revisions/:revisionId/restore',
  'POST /api/v1/servers/:id/config/server-dz/validate',
  'POST /api/v1/servers/:id/force-stop',
  'POST /api/v1/servers/:id/mods',
  'POST /api/v1/servers/:id/mods/batch',
  'POST /api/v1/servers/:id/mods/check-updates',
  'POST /api/v1/servers/:id/mods/import',
  'POST /api/v1/servers/:id/restart',
  'POST /api/v1/servers/:id/start',
  'POST /api/v1/servers/:id/stop',
  'POST /api/v1/servers/:id/stop/cancel',
  'POST /api/v1/servers/:id/validate-paths',
  'POST /api/v1/settings/steam/challenge/abort',
  'POST /api/v1/settings/steam/challenge/respond',
  'POST /api/v1/settings/steam/diagnostics',
  'POST /api/v1/settings/steam/session/clear',
  'POST /api/v1/settings/steam/session/login',
  'POST /api/v1/workshop/lookup',
  'PUT /api/v1/servers/:id/config/server-dz',
  'PUT /api/v1/servers/:id/mods/reorder',
];
const ADMIN_GUARDED_ROUTE_COUNT = ADMIN_GUARDED_ROUTES.length;
const DUMMY_PARAM = '00000000-0000-4000-8000-000000000000';

interface RouteEntry {
  key: string;
  method: string;
  url: string;
  hooks: unknown[];
  schema: unknown;
}

function toArray<T>(value: T | readonly T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? [...value] : [value as T];
}

describe('role gate over every registered route', () => {
  let app: FastifyInstance;
  let db: DatabaseInstance;
  let processManager: FakeProcessManager;
  let routes: RouteEntry[];

  beforeAll(async () => {
    db = initDatabase({ dbPath: ':memory:' });
    processManager = new FakeProcessManager();
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      }),
      db,
      processManager,
    });
    const table: RouteEntry[] = [];
    // Plugins load at ready(), so a root hook added now sees every route.
    app.addHook('onRoute', (route: RouteOptions) => {
      for (const method of toArray(route.method)) {
        table.push({
          key: `${method} ${route.url}`,
          method,
          url: route.url,
          hooks: toArray(route.onRequest as unknown),
          schema: route.schema,
        });
      }
    });
    await app.ready();
    routes = table.filter(r => r.method !== 'HEAD' && r.method !== 'OPTIONS');
  });

  afterAll(async () => {
    await app.close();
    db.close();
  });

  const isPublic = (r: RouteEntry) => PUBLIC_ROUTES.includes(r.key);
  const isOpen = (r: RouteEntry) => ROLE_GATE_OPEN_ROUTES.has(r.key);
  const hasAuthHook = (r: RouteEntry) =>
    r.hooks.includes(app.authenticate) || r.hooks.includes(app.authenticateSse);
  const isAdminGuarded = (r: RouteEntry) => r.hooks.includes(requireAdmin);
  const concreteUrl = (r: RouteEntry) => r.url.replace(/:\w+/g, DUMMY_PARAM);
  const callAs = (r: RouteEntry, role?: string) =>
    app.inject({
      method: r.method as 'GET',
      url: concreteUrl(r),
      headers: {
        authorization: `Bearer ${app.jwt.sign({ sub: 'probe', type: 'access', ...(role ? { role } : {}) })}`,
      },
    });

  it('registers the routes of the application', () => {
    expect(routes.length).toBeGreaterThan(ADMIN_GUARDED_ROUTE_COUNT);
  });

  it('leaves only the pinned public routes without an auth hook (AC-5)', () => {
    const unauthenticated = routes.filter(r => !hasAuthHook(r)).map(r => r.key);
    expect(unauthenticated.sort()).toEqual([...PUBLIC_ROUTES].sort());
  });

  it('lists only registered routes in the allowlist (AC-8)', () => {
    const keys = routes.map(r => r.key);
    for (const open of ROLE_GATE_OPEN_ROUTES) {
      expect(keys).toContain(open);
    }
  });

  it('carries requireAdmin on exactly the pinned admin-guarded routes (AC-9)', () => {
    const guarded = routes.filter(isAdminGuarded).map(r => r.key);
    expect(guarded.sort()).toEqual([...ADMIN_GUARDED_ROUTES].sort());
  });

  it('uses the shared requireAdmin on exactly 37 routes, after an auth hook (AC-9)', () => {
    const guarded = routes.filter(isAdminGuarded);
    expect(guarded).toHaveLength(ADMIN_GUARDED_ROUTE_COUNT);
    for (const route of guarded) {
      expect(hasAuthHook(route), route.key).toBe(true);
      const authIndex = route.hooks.findIndex(
        h => h === app.authenticate || h === app.authenticateSse,
      );
      expect(authIndex, route.key).toBeLessThan(route.hooks.indexOf(requireAdmin));
    }
  });

  it('denies a setup token on every route outside the public list and the allowlist (AC-5)', async () => {
    const targets = routes.filter(r => !isPublic(r) && !isOpen(r));
    expect(targets.length).toBeGreaterThan(ADMIN_GUARDED_ROUTE_COUNT);

    for (const route of targets) {
      const res = await callAs(route, 'setup');
      expect(res.statusCode, route.key).toBe(403);
      expect(res.json().errorCode, route.key).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
      expect(res.json().message, route.key).toBe(ADMIN_FORBIDDEN_MESSAGE);
    }
  });

  it.each([
    ['no role', undefined],
    ['an unknown role', 'viewer'],
  ])('denies a token with %s on every admin-guarded route (AC-7)', async (_name, role) => {
    for (const route of routes.filter(isAdminGuarded)) {
      const res = await callAs(route, role);
      expect(res.statusCode, route.key).toBe(403);
      expect(res.json().errorCode, route.key).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
    }
  });

  it('causes no spawn and no database change for a denied setup token (AC-7)', async () => {
    const snapshot = () => ({
      servers: db.sqlite.prepare('SELECT * FROM servers').all(),
      users: db.sqlite.prepare('SELECT * FROM users').all(),
      mods: db.sqlite.prepare('SELECT * FROM server_mods').all(),
    });
    const before = snapshot();

    for (const route of routes.filter(isAdminGuarded)) {
      await callAs(route, 'setup');
    }

    expect(processManager.spawnCalls).toHaveLength(0);
    expect(processManager.killCalls).toHaveLength(0);
    expect(snapshot()).toEqual(before);
  });

  it.each(['POST /api/v1/auth/login', 'GET /api/v1/auth/me'])(
    'builds the inline role enum of %s from USER_ROLE_VALUES (AC-2)',
    key => {
      const route = routes.find(r => r.key === key);
      const match = /"role":\{"type":"string","enum":(\[[^\]]*\])\}/.exec(
        JSON.stringify(route?.schema),
      );
      expect(JSON.parse(match?.[1] ?? '[]')).toEqual([...USER_ROLE_VALUES]);
    },
  );
});
