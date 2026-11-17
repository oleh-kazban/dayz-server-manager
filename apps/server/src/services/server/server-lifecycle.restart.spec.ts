import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type DatabaseInstance, initDatabase, type Server, servers } from '@aegis/database';

import { FakeProcessManager } from './__fixtures__/fake-process-manager';
import { FakeRconSessions } from './__fixtures__/fake-rcon-session';
import { ConfigStorageError } from './config-atomic-writer';
import {
  LifecycleError,
  RESTART_CANCELLED_MESSAGE,
  ServerLifecycleService,
} from './server-lifecycle.service';

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const START = 1_763_400_000_000;
const WINDOW = 10;
const STOP_TIMEOUT = 2_000;

describe('ServerLifecycleService.restart (DSM-00168)', () => {
  let dbInstance: DatabaseInstance;
  let processes: FakeProcessManager;
  let rcon: FakeRconSessions;
  let locks: { assertNoActiveEditLock: ReturnType<typeof vi.fn> };
  let broadcast: ReturnType<typeof vi.fn>;
  let logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let service: ServerLifecycleService;

  const row = (): Server =>
    dbInstance.db.select().from(servers).where(eq(servers.id, SERVER_ID)).get() as Server;
  const setRow = (values: Partial<Server>) =>
    dbInstance.db.update(servers).set(values).where(eq(servers.id, SERVER_ID)).run();
  const flush = async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };
  const restartFailed = () =>
    broadcast.mock.calls.filter(([event]) => event === 'server.restart.failed').map(c => c[1]);

  /** Starts the fake process and lets the startup window pass: status `running`. */
  async function runningServer(): Promise<number> {
    const started = await service.start(SERVER_ID);
    await vi.advanceTimersByTimeAsync(WINDOW);
    expect(row().status).toBe('running');
    rcon.commands.length = 0;
    broadcast.mockClear();
    return started.processPid as number;
  }

  async function expectLifecycleError(promise: Promise<unknown>, errorCode: string) {
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LifecycleError);
    expect(error).toMatchObject({ errorCode });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    dbInstance = initDatabase({ dbPath: ':memory:' });
    const now = new Date();
    dbInstance.db
      .insert(servers)
      .values({
        id: SERVER_ID,
        name: 'Chernarus',
        installPath: '/opt/dayz',
        profilePath: 'profiles',
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        rconIp: '127.0.0.1',
        rconPort: 2310,
        rconPassword: 'Rcon!Pass_42',
        createdAt: now,
        updatedAt: now,
      })
      .run();
    processes = new FakeProcessManager();
    rcon = new FakeRconSessions();
    locks = { assertNoActiveEditLock: vi.fn() };
    broadcast = vi.fn();
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    service = new ServerLifecycleService(
      { db: dbInstance.db, sqlite: dbInstance.sqlite, processes, locks, rcon: rcon.factory },
      {
        startupWindowMs: WINDOW,
        stopTimeoutMs: STOP_TIMEOUT,
        pollIntervalMs: 500,
        platform: 'linux',
        logger,
        broadcast,
      },
    );
  });

  afterEach(() => {
    service.close();
    dbInstance.close();
    vi.useRealTimers();
  });

  describe('now', () => {
    it('stops gracefully, then starts a new process once the old one has exited', async () => {
      const pid = await runningServer();

      const stopping = await service.restart(SERVER_ID);

      expect(stopping).toMatchObject({ status: 'stopping', restartRequested: true });
      expect(rcon.commands).toEqual(['#shutdown']);
      expect(broadcast).toHaveBeenLastCalledWith('server.status.changed', {
        serverId: SERVER_ID,
        status: 'stopping',
        lastExit: null,
        pendingStop: null,
        restartRequested: true,
      });

      processes.exit(pid, { code: 0, signal: null });
      await flush();

      expect(processes.spawnCalls).toHaveLength(2);
      expect(row()).toMatchObject({
        status: 'starting',
        restartRequested: false,
        lastExitReason: 'stopped',
        processPid: pid + 1,
      });
      expect(logger.info).toHaveBeenCalledWith(
        { serverId: SERVER_ID },
        'Restarting DayZ server after the graceful stop',
      );
      await vi.advanceTimersByTimeAsync(WINDOW);
      expect(row().status).toBe('running');
      expect(restartFailed()).toEqual([]);
    });

    it('starts again after the watchdog kills a process that ignored #shutdown', async () => {
      await runningServer();
      await service.restart(SERVER_ID);

      await vi.advanceTimersByTimeAsync(STOP_TIMEOUT);

      expect(processes.killCalls).toHaveLength(1);
      expect(processes.spawnCalls).toHaveLength(2);
      expect(row()).toMatchObject({ status: 'starting', lastExitReason: 'shutdown_timeout' });
    });

    it('refuses a server that is not running and changes nothing on RCON failure', async () => {
      await expectLifecycleError(service.restart(SERVER_ID), 'SERVER_NOT_RUNNING');
      await runningServer();
      rcon.loginResult = { ok: false, error: 'timeout', message: 'No answer.' };
      await expectLifecycleError(service.restart(SERVER_ID), 'SERVER_RCON_UNREACHABLE');
      expect(row()).toMatchObject({ status: 'running', restartRequested: false });
    });
  });

  describe('delayed', () => {
    it('warns players with the restart wording, then stops and starts when due', async () => {
      const pid = await runningServer();

      const scheduled = await service.restart(SERVER_ID, { delaySec: 60 });

      expect(scheduled).toMatchObject({ status: 'running', restartRequested: true });
      expect(rcon.commands).toEqual([
        '#say -1 Server is restarting in 1 minute. Please find a safe place and log out.',
      ]);
      expect(logger.info).toHaveBeenCalledWith(
        { serverId: SERVER_ID, delaySec: 60, restart: true },
        'Delayed graceful stop scheduled',
      );

      await vi.advanceTimersByTimeAsync(60_000);
      expect(row()).toMatchObject({
        status: 'stopping',
        restartRequested: true,
        pendingStopAt: null,
      });

      processes.exit(pid, { code: 0, signal: null });
      await flush();
      expect(row()).toMatchObject({ status: 'starting', restartRequested: false });
    });

    it('is cancelled like a stop, telling players the restart is off', async () => {
      await runningServer();
      await service.restart(SERVER_ID, { delaySec: 60 });

      const cancelled = await service.cancelPendingStop(SERVER_ID);
      await flush();

      expect(cancelled).toMatchObject({ restartRequested: false, pendingStopAt: null });
      expect(rcon.commands.at(-1)).toBe(`#say -1 ${RESTART_CANCELLED_MESSAGE}`);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(rcon.commands).not.toContain('#shutdown');
    });

    it('reports a stop-phase failure when due and keeps the server running', async () => {
      await runningServer();
      await service.restart(SERVER_ID, { delaySec: 60 });
      rcon.loginResult = { ok: false, error: 'login_failed', message: 'Wrong password.' };

      await vi.advanceTimersByTimeAsync(60_000);

      expect(row()).toMatchObject({
        status: 'running',
        restartRequested: false,
        pendingStopAt: null,
      });
      expect(restartFailed()).toEqual([
        {
          serverId: SERVER_ID,
          phase: 'stop',
          errorCode: 'SERVER_RCON_LOGIN_FAILED',
          message: 'Wrong password.',
        },
      ]);
      expect(broadcast.mock.calls.map(([event]) => event)).not.toContain('server.stop.failed');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ restart: true }),
        'Delayed restart failed to stop the server',
      );
    });

    it('a plain stop now replaces a pending restart and does not start again', async () => {
      const pid = await runningServer();
      await service.restart(SERVER_ID, { delaySec: 60 });

      await service.gracefulStop(SERVER_ID);
      expect(row()).toMatchObject({ status: 'stopping', restartRequested: false });

      processes.exit(pid, { code: 0, signal: null });
      await flush();
      expect(row().status).toBe('stopped');
      expect(processes.spawnCalls).toHaveLength(1);
    });
  });

  describe('start phase', () => {
    it.each([
      {
        label: 'a spawn failure',
        fail: () => (processes.spawnError = new Error('ENOENT')),
        errorCode: 'SERVER_START_FAILED',
        message: 'ENOENT',
        status: 'failed',
      },
      {
        label: 'a refused start (edit lock)',
        fail: () =>
          locks.assertNoActiveEditLock.mockImplementation(() => {
            throw new ConfigStorageError('CONFIG_EDIT_LOCKED', 'serverDZ.cfg is being edited.');
          }),
        errorCode: 'CONFIG_EDIT_LOCKED',
        message: 'serverDZ.cfg is being edited.',
        status: 'stopped',
      },
      {
        label: 'a non-Error failure',
        fail: () =>
          locks.assertNoActiveEditLock.mockImplementation(() => {
            throw 'disk gone';
          }),
        errorCode: 'SERVER_START_FAILED',
        message: 'Unknown start error.',
        status: 'stopped',
      },
    ] as const)(
      'reports $label as a start-phase failure',
      async ({ fail, errorCode, message, status }) => {
        const pid = await runningServer();
        await service.restart(SERVER_ID);
        fail();

        processes.exit(pid, { code: 0, signal: null });
        await flush();

        expect(row()).toMatchObject({ status, restartRequested: false });
        expect(restartFailed()).toEqual([
          { serverId: SERVER_ID, phase: 'start', errorCode, message },
        ]);
        expect(logger.error).toHaveBeenCalledWith(
          { serverId: SERVER_ID, errorCode, reason: message },
          'Restart failed to start the server',
        );
      },
    );
  });

  describe('dropped by', () => {
    it('a force-stop while stopping for the restart', async () => {
      await runningServer();
      await service.restart(SERVER_ID);

      await service.forceStop(SERVER_ID);
      await flush();

      expect(row()).toMatchObject({ status: 'stopped', restartRequested: false });
      expect(processes.spawnCalls).toHaveLength(1);
    });

    it('a crash while a delayed restart waits', async () => {
      const pid = await runningServer();
      await service.restart(SERVER_ID, { delaySec: 60 });

      processes.exit(pid, { code: 1, signal: null });
      await flush();

      expect(row()).toMatchObject({ status: 'failed', restartRequested: false });
      expect(processes.spawnCalls).toHaveLength(1);
    });
  });

  describe('DSM restart', () => {
    const seed = (status: 'running' | 'stopping', pendingStopAt: number | null) =>
      setRow({
        status,
        processPid: 4242,
        processStartToken: 'token-4242',
        processStartedAt: new Date(START - 60_000),
        pendingStopAt: pendingStopAt === null ? null : new Date(pendingStopAt),
        pendingStopRequestedAt: pendingStopAt === null ? null : new Date(START - 30_000),
        restartRequested: true,
      });

    it('starts a server whose restart stop completed while DSM was down', async () => {
      seed('stopping', null);

      await service.reconcile();
      await flush();

      expect(processes.spawnCalls).toHaveLength(1);
      expect(row()).toMatchObject({
        status: 'starting',
        lastExitReason: 'stopped',
        restartRequested: false,
      });
    });

    it('resumes a scheduled restart of a re-adopted server', async () => {
      seed('running', START + 30_000);
      processes.alive.set(4242, 'token-4242');

      await service.reconcile();
      expect(row()).toMatchObject({ status: 'running', restartRequested: true });

      await vi.advanceTimersByTimeAsync(30_000);
      expect(rcon.commands).toEqual(['#shutdown']);
      processes.exit(4242, { code: 0, signal: null });
      // A re-adopted process has no exit event: the liveness poll detects it.
      await vi.advanceTimersByTimeAsync(500);
      await flush();
      expect(processes.spawnCalls).toHaveLength(1);
      expect(row()).toMatchObject({
        status: 'starting',
        processPid: 1000,
        lastExitReason: 'stopped',
      });
    });

    it('treats a dead server that was running with a restart pending as an unexpected exit', async () => {
      seed('running', START + 30_000);

      await service.reconcile();
      await flush();

      expect(row()).toMatchObject({
        status: 'failed',
        restartRequested: false,
        pendingStopAt: null,
      });
      expect(processes.spawnCalls).toHaveLength(0);
    });
  });
});
