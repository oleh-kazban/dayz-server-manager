import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { apiErrorResponseSchema, serverDetailSchema } from '@aegis/api-contracts';
import {
  configEditLocks,
  type DatabaseInstance,
  initDatabase,
  servers,
  users,
} from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { FakeProcessManager } from '../services/server/__fixtures__/fake-process-manager';
import { FakeRconSessions } from '../services/server/__fixtures__/fake-rcon-session';

const SERVER_ID = '44444444-4444-4444-a444-444444444444';
const INSTALL_PATH = process.platform === 'win32' ? 'C:\\DayZServer' : '/opt/dayz';

interface Harness {
  app: FastifyInstance;
  rcon: FakeRconSessions;
  db: DatabaseInstance;
  processes: FakeProcessManager;
  adminToken: string;
  viewerToken: string;
}

const open: Harness[] = [];

async function createHarness(
  seed?: (db: DatabaseInstance) => void,
  options: { skipLifecycleReconcile?: boolean } = {},
): Promise<Harness> {
  const db = initDatabase({ dbPath: ':memory:' });
  const now = new Date();
  db.db
    .insert(servers)
    .values({
      id: SERVER_ID,
      name: 'Lifecycle Target',
      installPath: INSTALL_PATH,
      profilePath: 'profiles',
      missionPath: 'mpmissions/dayzOffline.chernarusplus',
      createdAt: now,
      updatedAt: now,
    })
    .run();
  seed?.(db);

  const processes = new FakeProcessManager();
  processes.alive.set(4242, 'token-4242');
  const rcon = new FakeRconSessions();
  const app = buildApp({
    config: loadEnv({
      SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
      LOG_LEVEL: 'silent',
      DSM_SERVER_STARTUP_WINDOW_MS: '60000',
    }),
    db,
    processManager: processes,
    rconSessionFactory: rcon.factory,
    ...options,
  });
  await app.ready();

  const harness: Harness = {
    app,
    rcon,
    db,
    processes,
    adminToken: app.jwt.sign({ sub: 'admin-id', role: 'admin', type: 'access' }),
    viewerToken: app.jwt.sign({ sub: 'viewer-id', role: 'viewer', type: 'access' }),
  };
  open.push(harness);
  return harness;
}

afterEach(async () => {
  for (const harness of open.splice(0)) {
    await harness.app.close();
    harness.db.close();
  }
});

const post = (h: Harness, action: string, token = h.adminToken, id = SERVER_ID) =>
  h.app.inject({
    method: 'POST',
    url: `/api/v1/servers/${id}/${action}`,
    headers: { authorization: `Bearer ${token}` },
  });

const statusOf = (h: Harness) =>
  h.db.db.select().from(servers).where(eq(servers.id, SERVER_ID)).get()?.status;

describe('Server lifecycle routes', () => {
  it('starts a server and exposes runtime in the detail, then force-stops it', async () => {
    const h = await createHarness();

    const started = await post(h, 'start');
    expect(started.statusCode).toBe(200);
    const detail = serverDetailSchema.parse(started.json());
    expect(detail).toMatchObject({
      status: 'starting',
      runtime: { pid: 1000, startedAt: new Date(5_000).toISOString() },
      lastExit: null,
    });
    expect(h.processes.spawnCalls[0]).toMatchObject({ cwd: INSTALL_PATH });

    const fetched = await h.app.inject({
      method: 'GET',
      url: `/api/v1/servers/${SERVER_ID}`,
      headers: { authorization: `Bearer ${h.adminToken}` },
    });
    expect(fetched.json().runtime).toEqual(detail.runtime);

    const again = await post(h, 'start');
    expect(again.statusCode).toBe(409);
    expect(again.json().errorCode).toBe('SERVER_TRANSITION_IN_PROGRESS');

    const stopped = await post(h, 'force-stop');
    expect(stopped.statusCode).toBe(200);
    expect(serverDetailSchema.parse(stopped.json())).toMatchObject({
      status: 'stopped',
      runtime: null,
      lastExit: { reason: 'force_stopped', exitCode: null, signal: null },
    });

    const list = await h.app.inject({
      method: 'GET',
      url: '/api/v1/servers',
      headers: { authorization: `Bearer ${h.adminToken}` },
    });
    expect(list.json()).toEqual([
      expect.objectContaining({
        id: SERVER_ID,
        status: 'stopped',
        lastExit: expect.objectContaining({ reason: 'force_stopped' }),
      }),
    ]);

    const notRunning = await post(h, 'force-stop');
    expect(notRunning.statusCode).toBe(409);
    expect(apiErrorResponseSchema.safeParse(notRunning.json()).success).toBe(true);
    expect(notRunning.json()).toMatchObject({
      errorCode: 'SERVER_NOT_RUNNING',
      params: { name: 'Lifecycle Target' },
    });
  });

  it('refuses to start while a serverDZ.cfg edit lock is held', async () => {
    const h = await createHarness(db => {
      const now = new Date();
      db.db
        .insert(users)
        .values({
          id: 'editor-id',
          username: 'editor',
          passwordHash: 'x',
          role: 'admin',
          createdAt: now,
        })
        .run();
      db.db
        .insert(configEditLocks)
        .values({
          serverId: SERVER_ID,
          fileKind: 'server_dz',
          sessionToken: '55555555-5555-4555-a555-555555555555',
          userId: 'editor-id',
          acquiredAt: now,
          expiresAt: new Date(now.getTime() + 60_000),
        })
        .run();
    });

    const response = await post(h, 'start');
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      errorCode: 'SERVER_CONFIG_EDIT_IN_PROGRESS',
      params: { holderName: 'editor' },
    });
    expect(statusOf(h)).toBe('stopped');
    expect(h.processes.spawnCalls).toEqual([]);
  });

  it('returns 422 SERVER_START_FAILED and records failed when the process cannot start', async () => {
    const h = await createHarness();
    h.processes.spawnError = new Error("Failed to start 'DayZServer' (ENOENT).");

    const response = await post(h, 'start');
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      errorCode: 'SERVER_START_FAILED',
      params: { reason: "Failed to start 'DayZServer' (ENOENT)." },
    });
    const detail = await h.app.inject({
      method: 'GET',
      url: `/api/v1/servers/${SERVER_ID}`,
      headers: { authorization: `Bearer ${h.adminToken}` },
    });
    expect(detail.json()).toMatchObject({
      status: 'failed',
      lastExit: { reason: 'start_failed' },
    });
  });

  it('returns 500 SERVER_STOP_FAILED when the kill fails', async () => {
    const h = await createHarness();
    await post(h, 'start');
    h.processes.killError = new Error('Access is denied.');

    const response = await post(h, 'force-stop');
    expect(response.statusCode).toBe(500);
    expect(response.json().errorCode).toBe('SERVER_STOP_FAILED');
    expect(statusOf(h)).toBe('starting');
  });

  it('enforces admin role, id format and existence on both actions', async () => {
    const h = await createHarness();
    for (const action of ['start', 'force-stop']) {
      expect((await post(h, action, h.viewerToken)).statusCode).toBe(403);
      expect((await post(h, action, h.adminToken, 'not-a-uuid')).statusCode).toBe(400);
      const missing = await post(h, action, h.adminToken, '66666666-6666-4666-a666-666666666666');
      expect(missing.statusCode).toBe(404);
      expect(missing.json().errorCode).toBe('SERVER_NOT_FOUND');
    }
    const unauthenticated = await h.app.inject({
      method: 'POST',
      url: `/api/v1/servers/${SERVER_ID}/start`,
    });
    expect(unauthenticated.statusCode).toBe(401);
  });

  it('re-adopts a surviving process on startup', async () => {
    const h = await createHarness(db => {
      db.db
        .update(servers)
        .set({
          status: 'running',
          processPid: 4242,
          processStartToken: 'token-4242',
          processStartedAt: new Date(1_000),
        })
        .where(eq(servers.id, SERVER_ID))
        .run();
    });
    expect(statusOf(h)).toBe('running');
    expect(h.app.lifecycle.watchedCount).toBe(1);
  });

  it('can skip reconciliation for tests that seed state after startup', async () => {
    const h = await createHarness(
      db => {
        db.db.update(servers).set({ status: 'running' }).where(eq(servers.id, SERVER_ID)).run();
      },
      { skipLifecycleReconcile: true },
    );
    expect(statusOf(h)).toBe('running');
  });

  it('rethrows unexpected errors to the global handler', async () => {
    const h = await createHarness();
    h.app.lifecycle.start = async () => {
      throw new Error('unexpected');
    };
    const response = await post(h, 'start');
    expect(response.statusCode).toBe(500);
    expect(response.json().errorCode).toBe('INTERNAL_SERVER_ERROR');
  });

  describe('POST /:id/stop (DSM-00163)', () => {
    const runningWithRcon = (db: DatabaseInstance) => {
      db.db
        .update(servers)
        .set({
          status: 'running',
          rconPassword: 'Rcon!Pass_42',
          processPid: 4242,
          processStartToken: 'token-4242',
          processStartedAt: new Date(1_000),
        })
        .where(eq(servers.id, SERVER_ID))
        .run();
    };

    it('sends #shutdown and returns the server as stopping', async () => {
      const h = await createHarness(runningWithRcon);
      const response = await post(h, 'stop');
      expect(response.statusCode).toBe(200);
      expect(serverDetailSchema.parse(response.json())).toMatchObject({
        status: 'stopping',
        runtime: { pid: 4242 },
      });
      expect(h.rcon.commands).toEqual(['#shutdown']);
      expect(h.processes.killCalls).toEqual([]);
    });

    it('maps RCON failures to 502 without changing anything', async () => {
      const h = await createHarness(runningWithRcon);
      h.rcon.loginResult = { ok: false, error: 'login_failed', message: 'rejected' };
      const rejected = await post(h, 'stop');
      expect(rejected.statusCode).toBe(502);
      expect(apiErrorResponseSchema.safeParse(rejected.json()).success).toBe(true);
      expect(rejected.json()).toMatchObject({
        errorCode: 'SERVER_RCON_LOGIN_FAILED',
        params: { name: 'Lifecycle Target', reason: 'rejected' },
      });

      h.rcon.loginResult = { ok: false, error: 'unreachable', message: 'ECONNREFUSED' };
      const unreachable = await post(h, 'stop');
      expect(unreachable.statusCode).toBe(502);
      expect(unreachable.json().errorCode).toBe('SERVER_RCON_UNREACHABLE');
      expect(statusOf(h)).toBe('running');
    });

    it('returns 409 when no RCON password is configured or the server is not running', async () => {
      const h = await createHarness(db => {
        runningWithRcon(db);
        db.db.update(servers).set({ rconPassword: null }).where(eq(servers.id, SERVER_ID)).run();
      });
      const missing = await post(h, 'stop');
      expect(missing.statusCode).toBe(409);
      expect(missing.json().errorCode).toBe('SERVER_RCON_NOT_CONFIGURED');

      const idle = await createHarness();
      const notRunning = await post(idle, 'stop');
      expect(notRunning.statusCode).toBe(409);
      expect(notRunning.json().errorCode).toBe('SERVER_NOT_RUNNING');
    });

    it('enforces admin role, id format and existence', async () => {
      const h = await createHarness();
      expect((await post(h, 'stop', h.viewerToken)).statusCode).toBe(403);
      expect((await post(h, 'stop', h.adminToken, 'not-a-uuid')).statusCode).toBe(400);
      expect(
        (await post(h, 'stop', h.adminToken, '66666666-6666-4666-a666-666666666666')).statusCode,
      ).toBe(404);
    });

    const postJson = (h: Harness, action: string, payload: unknown) =>
      h.app.inject({
        method: 'POST',
        url: `/api/v1/servers/${SERVER_ID}/${action}`,
        headers: { authorization: `Bearer ${h.adminToken}` },
        payload: payload as Record<string, unknown>,
      });

    it('schedules a delayed stop with a warning, refuses a second one and cancels it (DSM-00167)', async () => {
      const h = await createHarness(runningWithRcon);

      const scheduled = await postJson(h, 'stop', { delaySec: 300, message: 'Restart soon' });
      expect(scheduled.statusCode).toBe(200);
      const detail = serverDetailSchema.parse(scheduled.json());
      expect(detail.status).toBe('running');
      expect(detail.pendingStop).not.toBeNull();
      expect(
        Date.parse(detail.pendingStop?.executeAt ?? '') -
          Date.parse(detail.pendingStop?.requestedAt ?? ''),
      ).toBe(300_000);
      expect(h.rcon.commands).toEqual(['#say -1 Restart soon']);

      const fetched = await h.app.inject({
        method: 'GET',
        url: `/api/v1/servers/${SERVER_ID}`,
        headers: { authorization: `Bearer ${h.adminToken}` },
      });
      expect(fetched.json().pendingStop).toEqual(detail.pendingStop);

      const second = await postJson(h, 'stop', { delaySec: 60 });
      expect(second.statusCode).toBe(409);
      expect(second.json()).toMatchObject({
        errorCode: 'SERVER_STOP_ALREADY_PENDING',
        params: { name: 'Lifecycle Target' },
      });

      const cancelled = await post(h, 'stop/cancel');
      expect(cancelled.statusCode).toBe(200);
      expect(serverDetailSchema.parse(cancelled.json())).toMatchObject({
        status: 'running',
        pendingStop: null,
      });

      const again = await post(h, 'stop/cancel');
      expect(again.statusCode).toBe(409);
      expect(again.json().errorCode).toBe('SERVER_STOP_NOT_PENDING');
    });

    it('rejects an invalid stop body with field errors (DSM-00167)', async () => {
      const h = await createHarness(runningWithRcon);
      const response = await postJson(h, 'stop', { delaySec: 7200, message: 'Bye' });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        errorCode: 'VALIDATION_FAILED',
        fieldErrors: { delaySec: expect.anything() },
      });
      expect(h.rcon.commands).toEqual([]);
      expect(statusOf(h)).toBe('running');
    });

    it('enforces admin role, id format and existence on cancel (DSM-00167)', async () => {
      const h = await createHarness();
      expect((await post(h, 'stop/cancel', h.viewerToken)).statusCode).toBe(403);
      expect((await post(h, 'stop/cancel', h.adminToken, 'not-a-uuid')).statusCode).toBe(400);
      expect(
        (await post(h, 'stop/cancel', h.adminToken, '66666666-6666-4666-a666-666666666666'))
          .statusCode,
      ).toBe(404);
    });
  });
});
