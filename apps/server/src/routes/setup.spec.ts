import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiErrorResponseSchema, signInResponseSchema } from '@aegis/api-contracts';
import {
  type DatabaseInstance,
  initDatabase,
  sessions,
  UNUSABLE_PASSWORD_HASH,
  users,
  verifyPassword,
} from '@aegis/database';

import { type InsertedUser, insertUser } from '../__fixtures__/users';
import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { SETUP_FILE_NAME, writeSetupFile } from '../services/identity/setup-file';

const NEW_PASSWORD = 'Root-Pass-123!';
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- test fixture value
const SETUP_PASSWORD = 'Zk3-pQ9_vL2xW8nB5mT7rY1uC4hJ6dA0';
const HOUR = 60 * 60 * 1000;

describe('POST /api/v1/setup/root', () => {
  let app: FastifyInstance;
  let dbi: DatabaseInstance;
  let dir: string;
  let file: string;
  let logLines: string[];
  let setup: InsertedUser;
  let token: string;
  let consoleSpies: ReturnType<typeof vi.spyOn>[];

  const body = (overrides: Record<string, unknown> = {}) => ({
    username: 'owner',
    password: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
    ...overrides,
  });
  const post = (payload: unknown, bearer: string | null = token) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/setup/root',
      payload: payload as Record<string, unknown>,
      headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
    });
  const login = async (credentials: { usernameOrEmail: string; password: string }) =>
    (await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: credentials })).json()
      .accessToken as string;
  const userRows = () =>
    dbi.db
      .select()
      .from(users)
      .all()
      .map(u => `${u.role}:${u.username}`)
      .sort();
  const consoleCalls = () => consoleSpies.flatMap(spy => spy.mock.calls);

  beforeEach(async () => {
    dbi = initDatabase({ dbPath: ':memory:' });
    dir = mkdtempSync(path.join(tmpdir(), 'aegis-setup-route-'));
    file = path.join(dir, SETUP_FILE_NAME);
    logLines = [];
    consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(method =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'info',
      }),
      db: dbi,
      setupFileDir: dir,
      logStream: { write: line => logLines.push(line) },
    });
    await app.ready();
    setup = insertUser(dbi, {
      role: 'setup',
      username: 'setup-1a2b3c4d5e6f',
      password: SETUP_PASSWORD,
      createdAt: new Date(Math.floor(Date.now() / 1000) * 1000),
    });
    writeSetupFile(
      dir,
      { username: setup.username, password: SETUP_PASSWORD },
      new Date(Date.now() + HOUR),
    );
    token = await login(setup.credentials);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
    dbi.close();
    rmSync(dir, { recursive: true, force: true });
  });

  describe('success (AC-11)', () => {
    it('answers 200 with the login body shape for the new root', async () => {
      const res = await post(body());

      expect(res.statusCode).toBe(200);
      const parsed = signInResponseSchema.parse(res.json());
      expect(parsed.user).toMatchObject({ username: 'owner', role: 'root' });
      expect(parsed.expiresIn).toBe(900);
    });

    it.each([
      ['a role admin', { role: 'admin' }],
      ['an id and a role setup', { id: 'chosen-id', role: 'setup' }],
    ])(
      'ignores %s in the body: root has the server role and a generated id',
      async (_name, extra) => {
        const res = await post(body(extra));

        expect(res.statusCode).toBe(200);
        const roots = dbi.db.select().from(users).where(eq(users.role, 'root')).all();
        expect(roots).toHaveLength(1);
        expect(roots[0].username).toBe('owner');
        expect(roots[0].id).not.toBe('chosen-id');
        expect(res.json().user.role).toBe('root');
        expect(userRows()).toEqual(['root:owner']);
      },
    );

    it('leaves exactly one root with a verifying hash and no setup account or setup session', async () => {
      await post(body());

      const roots = dbi.db.select().from(users).where(eq(users.role, 'root')).all();
      expect(roots).toHaveLength(1);
      expect(verifyPassword(NEW_PASSWORD, roots[0].passwordHash)).toBe(true);
      expect(userRows()).toEqual(['root:owner']);
      expect(dbi.db.select().from(sessions).where(eq(sessions.userId, setup.id)).all()).toEqual([]);
    });

    it('deletes setup-credentials.txt after the commit', async () => {
      expect(existsSync(file)).toBe(true);

      await post(body());

      expect(existsSync(file)).toBe(false);
    });

    it('deletes a locked seeded admin and keeps other admins and their sessions', async () => {
      const locked = insertUser(dbi, { username: 'admin', email: 'admin@dsm.local' });
      dbi.db
        .update(users)
        .set({ passwordHash: UNUSABLE_PASSWORD_HASH })
        .where(eq(users.id, locked.id))
        .run();
      const operator = insertUser(dbi, { username: 'operator' });
      const operatorToken = await login(operator.credentials);

      const res = await post(body());

      expect(res.statusCode).toBe(200);
      expect(userRows()).toEqual(['admin:operator', 'root:owner']);
      expect(
        dbi.db.select().from(sessions).where(eq(sessions.userId, operator.id)).all(),
      ).toHaveLength(1);
      expect(operatorToken).toBeTruthy();
    });

    it('lets root take the name admin while a locked seeded admin exists', async () => {
      const locked = insertUser(dbi, { username: 'admin', email: 'admin@dsm.local' });
      dbi.db
        .update(users)
        .set({ passwordHash: UNUSABLE_PASSWORD_HASH })
        .where(eq(users.id, locked.id))
        .run();

      const res = await post(body({ username: 'admin' }));

      expect(res.statusCode).toBe(200);
      expect(userRows()).toEqual(['root:admin']);
    });

    it('returns tokens that work on admin routes and refresh', async () => {
      const res = await post(body());
      const { accessToken, refreshToken } = res.json();

      const servers = await app.inject({
        method: 'GET',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const refreshed = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(servers.statusCode).toBe(200);
      expect(refreshed.statusCode).toBe(200);
    });

    it('fails the same token on a second call because the account no longer exists', async () => {
      await post(body());

      const second = await post(body({ username: 'second' }));

      expect(second.statusCode).toBe(401);
      expect(second.json().errorCode).toBe('AUTH_SESSION_INVALID');
    });
  });

  describe('failures change nothing (AC-12)', () => {
    const unchanged = () => {
      expect(userRows()).toEqual(['setup:setup-1a2b3c4d5e6f']);
      expect(existsSync(file)).toBe(true);
    };

    it('answers 409 AUTH_SETUP_ALREADY_COMPLETE when a root exists', async () => {
      insertUser(dbi, { role: 'root', username: 'first-root' });

      const res = await post(body());

      expect(res.statusCode).toBe(409);
      expect(apiErrorResponseSchema.safeParse(res.json()).success).toBe(true);
      expect(res.json().errorCode).toBe('AUTH_SETUP_ALREADY_COMPLETE');
      expect(userRows()).toEqual(['root:first-root', 'setup:setup-1a2b3c4d5e6f']);
    });

    it('answers 401 AUTH_SETUP_SESSION_EXPIRED when the setup account expired', async () => {
      dbi.db
        .update(users)
        .set({ createdAt: new Date(Math.floor((Date.now() - 2 * HOUR) / 1000) * 1000) })
        .where(eq(users.id, setup.id))
        .run();

      const res = await post(body());

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_SETUP_SESSION_EXPIRED');
      unchanged();
    });

    it('answers 409 AUTH_USERNAME_TAKEN with fieldErrors.username', async () => {
      insertUser(dbi, { username: 'owner' });

      const res = await post(body());

      expect(res.statusCode).toBe(409);
      expect(res.json().errorCode).toBe('AUTH_USERNAME_TAKEN');
      expect(res.json().fieldErrors.username).toEqual({
        code: 'AUTH_USERNAME_TAKEN',
        message: 'This username is already taken',
      });
      expect(userRows()).toEqual(['admin:owner', 'setup:setup-1a2b3c4d5e6f']);
      expect(existsSync(file)).toBe(true);
    });

    it.each(['admin', 'root'] as const)('answers 403 for a %s caller', async role => {
      const user = insertUser(dbi, { role, username: `caller-${role}` });
      const callerToken = await login(user.credentials);

      const res = await post(body(), callerToken);

      expect(res.statusCode).toBe(403);
      expect(res.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
      expect(res.json().message).toBe(
        'Only the first-time setup session can create the root account.',
      );
      expect(userRows()).toContain('setup:setup-1a2b3c4d5e6f');
      expect(existsSync(file)).toBe(true);
    });

    it('answers 401 AUTH_SESSION_INVALID when the caller row is gone and changes nothing', async () => {
      const ghost = app.jwt.sign({
        sub: '00000000-0000-4000-8000-000000000000',
        role: 'setup',
        type: 'access',
      });
      const operator = insertUser(dbi, { username: 'operator' });

      const res = await post(body(), ghost);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_SESSION_INVALID');
      expect(userRows()).toEqual(['admin:operator', 'setup:setup-1a2b3c4d5e6f']);
      expect(existsSync(file)).toBe(true);
      expect(operator.id).toBeTruthy();
    });

    it.each([
      ['no token', null],
      ['an invalid token', 'bogus.token.value'],
    ])('answers 401 with %s', async (_name, bearer) => {
      const res = await post(body(), bearer);

      expect(res.statusCode).toBe(401);
      expect(res.json().errorCode).toBe('AUTH_TOKEN_MISSING_OR_INVALID');
      unchanged();
    });

    it.each([
      ['a username with a space', { username: 'a b' }, 'username'],
      ['a too short username', { username: 'ab' }, 'username'],
      ['a weak password', { password: 'weak', confirmPassword: 'weak' }, 'password'],
      ['a password mismatch', { confirmPassword: 'Other-Pass-123!' }, 'confirmPassword'],
      ['a missing confirmation', { confirmPassword: undefined }, 'confirmPassword'],
      ['a missing username', { username: undefined }, 'username'],
    ])('answers 400 VALIDATION_FAILED with %s on %s', async (_name, overrides, field) => {
      const res = await post(body(overrides));

      expect(res.statusCode).toBe(400);
      expect(res.json().errorCode).toBe('VALIDATION_FAILED');
      expect(Object.keys(res.json().fieldErrors)).toContain(field);
      expect(res.body).not.toContain(NEW_PASSWORD);
      unchanged();
    });
  });

  describe('atomicity and races (AC-13)', () => {
    it('answers 500 INTERNAL_SERVER_ERROR and changes nothing when a step throws', async () => {
      const locked = insertUser(dbi, { username: 'admin', email: 'admin@dsm.local' });
      dbi.db
        .update(users)
        .set({ passwordHash: UNUSABLE_PASSWORD_HASH })
        .where(eq(users.id, locked.id))
        .run();
      dbi.sqlite.exec(`
        CREATE TRIGGER fail_root_insert BEFORE INSERT ON users
        WHEN NEW.role = 'root'
        BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;
      `);

      const res = await post(body());

      expect(res.statusCode).toBe(500);
      expect(apiErrorResponseSchema.safeParse(res.json()).success).toBe(true);
      expect(res.json().errorCode).toBe('INTERNAL_SERVER_ERROR');
      expect(userRows()).toEqual(['admin:admin', 'setup:setup-1a2b3c4d5e6f']);
      expect(existsSync(file)).toBe(true);
      expect(
        dbi.db.select().from(sessions).where(eq(sessions.userId, setup.id)).all(),
      ).toHaveLength(1);
    });

    it('creates exactly one root for two concurrent requests and answers 409 or 401 to the other', async () => {
      const [first, second] = await Promise.all([
        post(body({ username: 'owner-one' })),
        post(body({ username: 'owner-two' })),
      ]);

      const statuses = [first.statusCode, second.statusCode].sort();
      expect(statuses[0]).toBe(200);
      expect([401, 409]).toContain(statuses[1]);
      expect(dbi.db.select().from(users).where(eq(users.role, 'root')).all()).toHaveLength(1);
    });

    it('answers 200 and logs one warning with the path only when the file cannot be deleted', async () => {
      rmSync(file);
      mkdirSync(path.join(file, 'child'), { recursive: true });

      const res = await post(body());

      expect(res.statusCode).toBe(200);
      expect(dbi.db.select().from(users).where(eq(users.role, 'root')).all()).toHaveLength(1);
      const warnings = logLines
        .map(line => JSON.parse(line) as { level: number; msg: string; file?: string })
        .filter(entry => entry.msg === 'Could not delete the setup credentials file');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].level).toBe(40);
      expect(warnings[0].file).toBe(file);
      expect(JSON.stringify(warnings[0])).not.toContain(NEW_PASSWORD);
      expect(JSON.stringify(warnings[0])).not.toContain(SETUP_PASSWORD);
    });
  });

  describe('credentials never leak (AC-8)', () => {
    it('keeps the passwords and the setup username out of logs and console on success', async () => {
      const res = await post(body());

      expect(res.statusCode).toBe(200);
      const captured = JSON.stringify([logLines, consoleCalls()]);
      expect(captured).not.toContain(NEW_PASSWORD);
      expect(captured).not.toContain(SETUP_PASSWORD);
      expect(captured).not.toContain(setup.username);
    });

    it('keeps the passwords out of logs, console and the response on a validation failure', async () => {
      const res = await post(body({ confirmPassword: 'Other-Pass-123!' }));

      expect(res.statusCode).toBe(400);
      const captured = JSON.stringify([logLines, consoleCalls(), res.body]);
      expect(captured).not.toContain(NEW_PASSWORD);
      expect(captured).not.toContain('Other-Pass-123!');
    });

    it('keeps the passwords out of the response and logs on a server failure', async () => {
      dbi.sqlite.exec(`
        CREATE TRIGGER fail_root_insert BEFORE INSERT ON users
        WHEN NEW.role = 'root'
        BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;
      `);

      const res = await post(body());

      expect(res.statusCode).toBe(500);
      const captured = JSON.stringify([logLines, consoleCalls(), res.body]);
      expect(captured).not.toContain(NEW_PASSWORD);
      expect(captured).not.toContain(SETUP_PASSWORD);
    });

    it('keeps the setup password out of logs and responses on login success and failure', async () => {
      const ok = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: setup.credentials,
      });
      const bad = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { usernameOrEmail: setup.username, password: 'wrong-password' },
      });

      expect(bad.statusCode).toBe(401);
      const captured = JSON.stringify([logLines, consoleCalls(), bad.body]);
      expect(captured).not.toContain(SETUP_PASSWORD);
      expect(ok.body).not.toContain(SETUP_PASSWORD);
    });
  });

  describe('gate and rate limit (AC-14)', () => {
    it('lets a setup token reach GET /auth/me and denies it on an admin route', async () => {
      const me = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${token}` },
      });
      const servers = await app.inject({
        method: 'GET',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(me.statusCode).toBe(200);
      expect(servers.statusCode).toBe(403);
    });

    it('answers 429 AUTH_RATE_LIMIT_EXCEEDED on the 11th request in a minute', async () => {
      for (let i = 0; i < 10; i++) {
        const res = await post(body({ confirmPassword: 'Other-Pass-123!' }));
        expect(res.statusCode).toBe(400);
      }

      const limited = await post(body());

      expect(limited.statusCode).toBe(429);
      expect(limited.json().errorCode).toBe('AUTH_RATE_LIMIT_EXCEEDED');
      expect(userRows()).toEqual(['setup:setup-1a2b3c4d5e6f']);
    });
  });
});
