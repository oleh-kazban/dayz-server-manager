import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_LAUNCH_OPTIONS, type ServerStatus } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase, type Server, servers } from '@aegis/database';
import { ProcessSpawnError } from '@aegis/platform';

import { FakeProcessManager } from './__fixtures__/fake-process-manager';
import { ConfigStorageError } from './config-atomic-writer';
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_STARTUP_WINDOW_MS,
  LifecycleError,
  ServerLifecycleService,
  toServerLastExit,
  toServerRuntime,
} from './server-lifecycle.service';

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const WINDOW = 1_000;
const POLL = 500;

describe('ServerLifecycleService', () => {
  let dbInstance: DatabaseInstance;
  let processes: FakeProcessManager;
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

  /** Lets queued promise callbacks (exit events, async transitions) run. */
  const flush = async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
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
        gamePort: 2302,
        launchOptions: DEFAULT_LAUNCH_OPTIONS,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    processes = new FakeProcessManager();
    locks = { assertNoActiveEditLock: vi.fn() };
    broadcast = vi.fn();
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    service = new ServerLifecycleService(
      { db: dbInstance.db, sqlite: dbInstance.sqlite, processes, locks },
      {
        startupWindowMs: WINDOW,
        pollIntervalMs: POLL,
        platform: 'linux',
        clock: () => 9_000,
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

  describe('start', () => {
    it('spawns the compiled launch command, records the process, and becomes running after the window', async () => {
      const started = await service.start(SERVER_ID);

      expect(processes.spawnCalls).toEqual([
        {
          executable: '/opt/dayz/DayZServer',
          cwd: '/opt/dayz',
          args: expect.arrayContaining(['-config=serverDZ.cfg', '-port=2302', '-doLogs']),
        },
      ]);
      expect(locks.assertNoActiveEditLock).toHaveBeenCalledWith(SERVER_ID);
      expect(started).toMatchObject({
        status: 'starting',
        processPid: 1000,
        processStartToken: 'token-1000',
        processStartedAt: new Date(5_000),
      });
      expect(broadcast).toHaveBeenLastCalledWith('server.status.changed', {
        serverId: SERVER_ID,
        status: 'starting',
        lastExit: null,
        pendingStop: null,
        restartRequested: false,
      });
      expect(service.watchedCount).toBe(1);

      await vi.advanceTimersByTimeAsync(WINDOW);
      expect(row().status).toBe('running');
      expect(broadcast).toHaveBeenLastCalledWith(
        'server.status.changed',
        expect.objectContaining({ status: 'running' }),
      );
    });

    it('can start again from failed', async () => {
      setRow({ status: 'failed' });
      expect((await service.start(SERVER_ID)).status).toBe('starting');
    });

    it.each<[ServerStatus, string]>([
      ['running', 'SERVER_ALREADY_RUNNING'],
      ['starting', 'SERVER_TRANSITION_IN_PROGRESS'],
      ['stopping', 'SERVER_TRANSITION_IN_PROGRESS'],
    ])('refuses to start a %s server with %s and changes nothing', async (status, code) => {
      setRow({ status });
      const error = await service.start(SERVER_ID).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(LifecycleError);
      expect(error).toMatchObject({ errorCode: code, statusCode: 409 });
      expect(row().status).toBe(status);
      expect(processes.spawnCalls).toEqual([]);
    });

    it('refuses while a serverDZ.cfg edit lock is held', async () => {
      locks.assertNoActiveEditLock.mockImplementation(() => {
        throw new ConfigStorageError('SERVER_CONFIG_EDIT_IN_PROGRESS', 'locked', {
          holderName: 'admin',
        });
      });
      await expect(service.start(SERVER_ID)).rejects.toMatchObject({
        errorCode: 'SERVER_CONFIG_EDIT_IN_PROGRESS',
        statusCode: 409,
      });
      expect(row().status).toBe('stopped');
      expect(processes.spawnCalls).toEqual([]);
    });

    it('refuses when the launch command is not ready', async () => {
      setRow({ installPath: 'relative/dir' });
      await expect(service.start(SERVER_ID)).rejects.toMatchObject({
        errorCode: 'SERVER_LAUNCH_NOT_READY',
        statusCode: 422,
        params: { name: 'Chernarus', reason: expect.stringContaining('absolute') },
      });
      expect(row().status).toBe('stopped');
    });

    it('reports an unknown server', async () => {
      await expect(service.start('22222222-2222-4222-a222-222222222222')).rejects.toMatchObject({
        errorCode: 'SERVER_NOT_FOUND',
        statusCode: 404,
      });
    });

    it('marks failed/start_failed with the exit details when the process dies before identity read', async () => {
      processes.spawnError = new ProcessSpawnError('SPAWN_EXITED_EARLY', 'exited immediately', {
        exit: { code: 3, signal: null },
      });
      await expect(service.start(SERVER_ID)).rejects.toMatchObject({
        errorCode: 'SERVER_START_FAILED',
        statusCode: 422,
        params: { name: 'Chernarus', reason: 'exited immediately' },
      });
      expect(row()).toMatchObject({
        status: 'failed',
        processPid: null,
        lastExitReason: 'start_failed',
        lastExitCode: 3,
        lastExitAt: new Date(9_000),
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it('handles non-Error spawn failures', async () => {
      processes.spawnError = 'boom';
      await expect(service.start(SERVER_ID)).rejects.toMatchObject({
        params: { reason: 'Unknown spawn error.' },
      });
      expect(row()).toMatchObject({ status: 'failed', lastExitCode: null });
    });
  });

  describe('exit detection', () => {
    it('an exit inside the startup window becomes failed/start_failed with the exit code', async () => {
      await service.start(SERVER_ID);
      processes.exit(1000, { code: 2, signal: null });
      await flush();
      expect(row()).toMatchObject({
        status: 'failed',
        processPid: null,
        lastExitReason: 'start_failed',
        lastExitCode: 2,
      });
      expect(service.watchedCount).toBe(0);
      await vi.advanceTimersByTimeAsync(WINDOW);
      expect(row().status).toBe('failed');
    });

    it('an exit after the window becomes failed/crashed and keeps the signal', async () => {
      await service.start(SERVER_ID);
      await vi.advanceTimersByTimeAsync(WINDOW);
      processes.exit(1000, { code: null, signal: 'SIGSEGV' });
      await flush();
      expect(toServerLastExit(row())).toEqual({
        reason: 'crashed',
        exitCode: null,
        signal: 'SIGSEGV',
        at: new Date(9_000).toISOString(),
      });
      expect(row().status).toBe('failed');
    });

    it('a process gone at the end of the window without an exit event is a failed start', async () => {
      await service.start(SERVER_ID);
      processes.alive.clear();
      await vi.advanceTimersByTimeAsync(WINDOW);
      expect(row()).toMatchObject({ status: 'failed', lastExitReason: 'start_failed' });
    });

    it('a PID reused by another process at the end of the window is a failed start', async () => {
      await service.start(SERVER_ID);
      // Same PID, different process: the poll's PID check passes, the identity check does not.
      processes.alive.set(1000, 'another-process');
      await vi.advanceTimersByTimeAsync(WINDOW);
      expect(row()).toMatchObject({ status: 'failed', lastExitReason: 'start_failed' });
    });

    it('tracks several servers with one shared poll', async () => {
      const otherId = '33333333-3333-4333-a333-333333333333';
      const now = new Date();
      dbInstance.db
        .insert(servers)
        .values({
          id: otherId,
          name: 'Livonia',
          installPath: '/opt/livonia',
          profilePath: 'profiles',
          missionPath: 'mpmissions/dayzOffline.enoch',
          gamePort: 2402,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      await service.start(SERVER_ID);
      await service.start(otherId);
      expect(service.watchedCount).toBe(2);
      processes.alive.delete(1001);
      await vi.advanceTimersByTimeAsync(POLL);
      expect(service.watchedCount).toBe(1);
      expect(row().status).toBe('starting');
    });

    it('the liveness poll catches exits without an exit event', async () => {
      await service.start(SERVER_ID);
      await vi.advanceTimersByTimeAsync(WINDOW);
      processes.alive.clear();
      await vi.advanceTimersByTimeAsync(POLL);
      expect(row()).toMatchObject({ status: 'failed', lastExitReason: 'crashed' });
    });

    it('ignores an exit when the stored process no longer matches (GUARD-03)', async () => {
      await service.start(SERVER_ID);
      setRow({ processStartToken: 'someone-else' });
      processes.exit(1000);
      await flush();
      expect(row().status).toBe('starting');
    });

    it('records the right outcome when the stored status was changed externally', async () => {
      await service.start(SERVER_ID);
      setRow({ status: 'stopping' });
      processes.exit(1000, { code: 0, signal: null });
      await flush();
      expect(row()).toMatchObject({ status: 'stopped', lastExitReason: 'stopped' });

      setRow({ status: 'stopped', processPid: null, processStartToken: null });
      await service.start(SERVER_ID);
      setRow({ status: 'failed' });
      processes.exit(1001);
      await flush();
      expect(row()).toMatchObject({ status: 'failed', lastExitReason: 'crashed' });

      setRow({ status: 'stopped', processPid: null, processStartToken: null });
      await service.start(SERVER_ID);
      setRow({ status: 'stopped' });
      processes.exit(1002);
      await flush();
      expect(row()).toMatchObject({ status: 'stopped', processPid: null });
    });

    it('a second concurrent poll is skipped while one is running', async () => {
      await service.start(SERVER_ID);
      processes.alive.clear();
      const poll = (service as unknown as { pollOnce(): Promise<void> }).pollOnce.bind(service);
      await Promise.all([poll(), poll()]);
      expect(row()).toMatchObject({ status: 'failed', lastExitReason: 'start_failed' });
    });
  });

  describe('forceStop', () => {
    it('kills the tracked process tree and records force_stopped', async () => {
      await service.start(SERVER_ID);
      await vi.advanceTimersByTimeAsync(WINDOW);

      const stopped = await service.forceStop(SERVER_ID);
      expect(processes.killCalls).toEqual([{ pid: 1000, startToken: 'token-1000' }]);
      expect(stopped).toMatchObject({
        status: 'stopped',
        processPid: null,
        lastExitReason: 'force_stopped',
      });
      expect(service.watchedCount).toBe(0);

      processes.exit(1000);
      await flush();
      expect(row().status).toBe('stopped');
    });

    it('refuses when there is no running process', async () => {
      await expect(service.forceStop(SERVER_ID)).rejects.toMatchObject({
        errorCode: 'SERVER_NOT_RUNNING',
        statusCode: 409,
      });
      setRow({ status: 'running' });
      await expect(service.forceStop(SERVER_ID)).rejects.toMatchObject({
        errorCode: 'SERVER_NOT_RUNNING',
      });
    });

    it('restores the previous status and keeps watching when the kill fails', async () => {
      await service.start(SERVER_ID);
      processes.killError = new Error('Access is denied.');
      await expect(service.forceStop(SERVER_ID)).rejects.toMatchObject({
        errorCode: 'SERVER_STOP_FAILED',
        statusCode: 500,
        params: { reason: 'Access is denied.' },
      });
      expect(row()).toMatchObject({ status: 'starting', processPid: 1000 });
      expect(service.watchedCount).toBe(1);
      expect(logger.error).toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(WINDOW);
      expect(row().status).toBe('running');

      processes.killError = Object.assign(Object.create(null), { message: 'x' }) as Error;
      await expect(service.forceStop(SERVER_ID)).rejects.toMatchObject({
        params: { reason: 'Unknown kill error.' },
      });
      expect(row().status).toBe('running');
    });
  });

  describe('reconcile', () => {
    const seedProcess = (status: ServerStatus, alive: boolean) => {
      setRow({
        status,
        processPid: 4242,
        processStartToken: 'token-4242',
        processStartedAt: new Date(1_000),
      });
      if (alive) {
        processes.alive.set(4242, 'token-4242');
      }
    };

    it.each<ServerStatus>(['starting', 'running', 'stopping', 'stopped'])(
      're-adopts a live %s process as running',
      async status => {
        seedProcess(status, true);
        await service.reconcile();
        expect(row()).toMatchObject({ status: 'running', processPid: 4242 });
        expect(service.watchedCount).toBe(1);
        expect(logger.info).toHaveBeenCalledWith(
          { serverId: SERVER_ID, processPid: 4242 },
          'Re-adopted DayZ server',
        );
      },
    );

    it('marks a vanished running process as failed/exited_while_offline', async () => {
      seedProcess('running', false);
      await service.reconcile();
      expect(row()).toMatchObject({
        status: 'failed',
        processPid: null,
        lastExitReason: 'exited_while_offline',
      });
    });

    it('marks a vanished stopping process as stopped', async () => {
      seedProcess('stopping', false);
      await service.reconcile();
      expect(row()).toMatchObject({ status: 'stopped', lastExitReason: 'stopped' });
    });

    it('resets an active status without a recorded process and leaves idle servers alone', async () => {
      setRow({ status: 'running' });
      await service.reconcile();
      expect(row().status).toBe('stopped');
      await service.reconcile();
      expect(row().status).toBe('stopped');
      expect(broadcast).toHaveBeenCalledTimes(1);
    });

    it('falls back to the PID check when the identity lookup fails', async () => {
      seedProcess('running', true);
      processes.isAliveError = new Error('PowerShell unavailable');
      await service.reconcile();
      expect(row().status).toBe('running');

      service.close();
      processes.isAliveError = 'identity service down' as unknown as Error;
      await service.reconcile();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        'Process identity check failed; using PID liveness',
      );
    });
  });

  it('uses defaults and works without a broadcaster or logger', async () => {
    const plain = new ServerLifecycleService({
      db: dbInstance.db,
      sqlite: dbInstance.sqlite,
      processes,
      locks,
    });
    expect(DEFAULT_STARTUP_WINDOW_MS).toBe(60_000);
    expect(DEFAULT_POLL_INTERVAL_MS).toBe(5_000);
    setRow({ installPath: process.platform === 'win32' ? 'C:\\DayZ' : '/opt/dayz' });
    expect((await plain.start(SERVER_ID)).status).toBe('starting');
    await vi.advanceTimersByTimeAsync(DEFAULT_STARTUP_WINDOW_MS);
    expect(row().status).toBe('running');
    plain.close();
  });

  it('maps unknown error codes to HTTP 500', () => {
    expect(new LifecycleError('INTERNAL_SERVER_ERROR', 'x').statusCode).toBe(500);
  });

  it('maps runtime and last-exit fields only when complete', () => {
    expect(toServerRuntime({ processPid: null, processStartedAt: new Date() })).toBeNull();
    expect(toServerRuntime({ processPid: 7, processStartedAt: null })).toBeNull();
    expect(toServerRuntime({ processPid: 7, processStartedAt: new Date(0) })).toEqual({
      pid: 7,
      startedAt: new Date(0).toISOString(),
    });
    expect(
      toServerLastExit({
        lastExitReason: null,
        lastExitCode: null,
        lastExitSignal: null,
        lastExitAt: new Date(),
      }),
    ).toBeNull();
    expect(
      toServerLastExit({
        lastExitReason: 'crashed',
        lastExitCode: null,
        lastExitSignal: null,
        lastExitAt: null,
      }),
    ).toBeNull();
  });
});
