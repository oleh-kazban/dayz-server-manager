import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type DatabaseInstance, initDatabase, type Server, servers } from '@aegis/database';

import { FakeProcessManager } from './__fixtures__/fake-process-manager';
import { FakeRconSessions } from './__fixtures__/fake-rcon-session';
import {
  defaultStopWarning,
  formatStopDelay,
  LifecycleError,
  ServerLifecycleService,
  STOP_CANCELLED_MESSAGE,
  toServerPendingStop,
} from './server-lifecycle.service';

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const START = 1_763_400_000_000;
const RCON_PASSWORD = 'Rcon!Pass_42';
const FIVE_MINUTES = 300;

describe('ServerLifecycleService delayed stop (DSM-00167)', () => {
  let dbInstance: DatabaseInstance;
  let processes: FakeProcessManager;
  let rcon: FakeRconSessions;
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
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  const createService = () =>
    new ServerLifecycleService(
      {
        db: dbInstance.db,
        sqlite: dbInstance.sqlite,
        processes,
        locks: { assertNoActiveEditLock: vi.fn() },
        rcon: rcon.factory,
      },
      { startupWindowMs: 10, stopTimeoutMs: 2_000, platform: 'linux', logger, broadcast },
    );

  /** Starts the fake process and lets the startup window pass: status `running`. */
  async function runningServer(): Promise<number> {
    const started = await service.start(SERVER_ID);
    await vi.advanceTimersByTimeAsync(10);
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

  const pendingEvent = (pendingStop: { executeAt: string; requestedAt: string } | null) => [
    'server.status.changed',
    { serverId: SERVER_ID, status: 'running', lastExit: null, pendingStop },
  ];

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
        rconPassword: RCON_PASSWORD,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    processes = new FakeProcessManager();
    rcon = new FakeRconSessions();
    broadcast = vi.fn();
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    service = createService();
  });

  afterEach(() => {
    service.close();
    dbInstance.close();
    vi.useRealTimers();
  });

  describe('scheduling', () => {
    it('warns players, stays running, persists the stop and runs it when the delay ends', async () => {
      await runningServer();
      const requestedAt = Date.now();

      const scheduled = await service.gracefulStop(SERVER_ID, { delaySec: FIVE_MINUTES });

      const executeAt = new Date(requestedAt + FIVE_MINUTES * 1000);
      expect(scheduled).toMatchObject({
        status: 'running',
        pendingStopAt: executeAt,
        pendingStopRequestedAt: new Date(requestedAt),
      });
      expect(rcon.commands).toEqual([
        '#say -1 Server is shutting down in 5 minutes. Please find a safe place and log out.',
      ]);
      expect(rcon.closed).toBe(1);
      expect(broadcast).toHaveBeenLastCalledWith(
        ...pendingEvent({
          executeAt: executeAt.toISOString(),
          requestedAt: new Date(requestedAt).toISOString(),
        }),
      );

      await vi.advanceTimersByTimeAsync(FIVE_MINUTES * 1000 - 1);
      expect(rcon.commands).toHaveLength(1);
      expect(row().status).toBe('running');

      await vi.advanceTimersByTimeAsync(1);
      expect(rcon.commands.at(-1)).toBe('#shutdown');
      expect(row()).toMatchObject({
        status: 'stopping',
        pendingStopAt: null,
        pendingStopRequestedAt: null,
      });
      expect(broadcast).toHaveBeenLastCalledWith('server.status.changed', {
        serverId: SERVER_ID,
        status: 'stopping',
        lastExit: null,
        pendingStop: null,
      });
    });

    it('sends the custom warning instead of the default one', async () => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: 60, message: 'Wipe in one minute!' });
      expect(rcon.commands).toEqual(['#say -1 Wipe in one minute!']);
    });

    it('allows one pending stop per server', async () => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: FIVE_MINUTES });

      await expectLifecycleError(
        service.gracefulStop(SERVER_ID, { delaySec: 60 }),
        'SERVER_STOP_ALREADY_PENDING',
      );
      expect(rcon.commands).toHaveLength(1);
    });

    it.each([
      [
        { ok: false, error: 'login_failed', message: 'Wrong password.' },
        'SERVER_RCON_LOGIN_FAILED',
      ],
      [{ ok: false, error: 'timeout', message: 'No answer.' }, 'SERVER_RCON_UNREACHABLE'],
    ] as const)('rolls back when RCON login fails (%j)', async (loginResult, errorCode) => {
      await runningServer();
      rcon.loginResult = loginResult;

      await expectLifecycleError(service.gracefulStop(SERVER_ID, { delaySec: 60 }), errorCode);

      expect(row()).toMatchObject({ status: 'running', pendingStopAt: null });
      expect(broadcast).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(rcon.commands).toEqual([]);
    });

    it('rolls back when the warning is not acknowledged', async () => {
      await runningServer();
      rcon.commandResult = { ok: false, error: 'timeout', message: 'No acknowledgement.' };

      await expectLifecycleError(
        service.gracefulStop(SERVER_ID, { delaySec: 60 }),
        'SERVER_RCON_UNREACHABLE',
      );
      expect(row().pendingStopAt).toBeNull();
    });

    it('rolls back without an RCON password', async () => {
      await runningServer();
      setRow({ rconPassword: null, rconPasswordEncrypted: null });

      await expectLifecycleError(
        service.gracefulStop(SERVER_ID, { delaySec: 60 }),
        'SERVER_RCON_NOT_CONFIGURED',
      );
      expect(row().pendingStopAt).toBeNull();
    });

    it('refuses a server that is not running or is busy', async () => {
      await expectLifecycleError(
        service.gracefulStop(SERVER_ID, { delaySec: 60 }),
        'SERVER_NOT_RUNNING',
      );
      await service.start(SERVER_ID);
      await expectLifecycleError(
        service.gracefulStop(SERVER_ID, { delaySec: 60 }),
        'SERVER_TRANSITION_IN_PROGRESS',
      );
      expect(rcon.targets).toEqual([]);
    });

    it('a stop without delay replaces the pending stop', async () => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: FIVE_MINUTES });

      const stopping = await service.gracefulStop(SERVER_ID, { delaySec: 0 });

      expect(stopping).toMatchObject({ status: 'stopping', pendingStopAt: null });
      await vi.advanceTimersByTimeAsync(FIVE_MINUTES * 1000);
      expect(rcon.commands.filter(command => command === '#shutdown')).toHaveLength(1);
    });
  });

  describe('cancel', () => {
    it('clears the stop, tells players and never runs it', async () => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: FIVE_MINUTES });

      const cancelled = await service.cancelPendingStop(SERVER_ID);
      await flush();

      expect(cancelled).toMatchObject({ status: 'running', pendingStopAt: null });
      expect(broadcast).toHaveBeenLastCalledWith(...pendingEvent(null));
      expect(rcon.commands.at(-1)).toBe(`#say -1 ${STOP_CANCELLED_MESSAGE}`);
      expect(logger.info).toHaveBeenCalledWith({ serverId: SERVER_ID }, 'Pending stop cancelled');

      await vi.advanceTimersByTimeAsync(FIVE_MINUTES * 1000);
      expect(rcon.commands).not.toContain('#shutdown');
      expect(row().status).toBe('running');
    });

    it('refuses when nothing is pending', async () => {
      await expectLifecycleError(service.cancelPendingStop(SERVER_ID), 'SERVER_STOP_NOT_PENDING');
    });

    it.each([
      ['login', () => ({ loginResult: { ok: false, error: 'timeout', message: 'No answer.' } })],
      [
        'command',
        () => ({ commandResult: { ok: false, error: 'timeout', message: 'No acknowledgement.' } }),
      ],
    ] as const)('only logs a failed cancel announcement (%s)', async (_stage, failure) => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: FIVE_MINUTES });
      Object.assign(rcon, failure());

      await expect(service.cancelPendingStop(SERVER_ID)).resolves.toMatchObject({
        pendingStopAt: null,
      });
      await flush();
      expect(logger.warn).toHaveBeenCalledWith(
        { serverId: SERVER_ID, reason: expect.any(String) },
        'In-game announcement failed',
      );
    });

    it('logs a non-Error announcement failure', async () => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: FIVE_MINUTES });
      rcon.onLogin = () => {
        throw 'socket gone';
      };
      await service.cancelPendingStop(SERVER_ID);
      await flush();
      expect(logger.warn).toHaveBeenCalledWith(
        { serverId: SERVER_ID, reason: 'socket gone' },
        'In-game announcement failed',
      );
    });
  });

  describe('leaving running', () => {
    it('force-stop drops the pending stop', async () => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: FIVE_MINUTES });

      await service.forceStop(SERVER_ID);

      expect(row()).toMatchObject({ status: 'stopped', pendingStopAt: null });
      await vi.advanceTimersByTimeAsync(FIVE_MINUTES * 1000);
      expect(rcon.commands).not.toContain('#shutdown');
    });

    it('a crash drops the pending stop', async () => {
      const pid = await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: FIVE_MINUTES });

      processes.exit(pid, { code: 1, signal: null });
      await flush();

      expect(row()).toMatchObject({
        status: 'failed',
        lastExitReason: 'crashed',
        pendingStopAt: null,
      });
      await vi.advanceTimersByTimeAsync(FIVE_MINUTES * 1000);
      expect(rcon.commands).not.toContain('#shutdown');
    });
  });

  describe('when the stop comes due', () => {
    it('keeps the server running, clears the stop and reports the failure', async () => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: 60 });
      rcon.loginResult = { ok: false, error: 'login_failed', message: 'Wrong password.' };

      await vi.advanceTimersByTimeAsync(60_000);

      expect(row()).toMatchObject({ status: 'running', pendingStopAt: null });
      expect(broadcast).toHaveBeenCalledWith(...pendingEvent(null));
      expect(broadcast).toHaveBeenLastCalledWith('server.stop.failed', {
        serverId: SERVER_ID,
        errorCode: 'SERVER_RCON_LOGIN_FAILED',
        message: 'Wrong password.',
      });
      expect(logger.error).toHaveBeenCalledWith(
        { serverId: SERVER_ID, errorCode: 'SERVER_RCON_LOGIN_FAILED', reason: 'Wrong password.' },
        'Delayed stop failed',
      );
    });

    it.each([
      [new Error('socket closed'), 'socket closed'],
      ['socket gone', 'Unknown stop error.'],
    ])('reports an unexpected failure (%s) as SERVER_STOP_FAILED', async (thrown, message) => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: 60 });
      rcon.onLogin = () => {
        throw thrown;
      };

      await vi.advanceTimersByTimeAsync(60_000);

      expect(broadcast).toHaveBeenLastCalledWith('server.stop.failed', {
        serverId: SERVER_ID,
        errorCode: 'SERVER_STOP_FAILED',
        message,
      });
    });

    it('does nothing when the stored stop was changed in the meantime', async () => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: 60 });
      setRow({ pendingStopAt: new Date(START + 999_000) });

      await vi.advanceTimersByTimeAsync(60_000);

      expect(rcon.commands).not.toContain('#shutdown');
      expect(row().status).toBe('running');
    });
  });

  describe('DSM restart', () => {
    const seedRunning = (pendingStopAt: number | null) => {
      setRow({
        status: 'running',
        processPid: 4242,
        processStartToken: 'token-4242',
        processStartedAt: new Date(START - 60_000),
        pendingStopAt: pendingStopAt === null ? null : new Date(pendingStopAt),
        pendingStopRequestedAt: pendingStopAt === null ? null : new Date(START - 30_000),
      });
    };

    it('resumes the remaining delay of a re-adopted server', async () => {
      seedRunning(START + 90_000);
      processes.alive.set(4242, 'token-4242');

      await service.reconcile();
      expect(logger.info).toHaveBeenCalledWith(
        { serverId: SERVER_ID, executeAt: new Date(START + 90_000).toISOString() },
        'Resumed pending stop',
      );

      await vi.advanceTimersByTimeAsync(89_999);
      expect(rcon.commands).toEqual([]);
      await vi.advanceTimersByTimeAsync(1);
      expect(rcon.commands).toEqual(['#shutdown']);
      expect(row().status).toBe('stopping');
    });

    it('stops right away when the stop came due while DSM was down', async () => {
      seedRunning(START - 1_000);
      processes.alive.set(4242, 'token-4242');

      await service.reconcile();
      await vi.advanceTimersByTimeAsync(0);

      expect(rcon.commands).toEqual(['#shutdown']);
    });

    it('drops the stop of a server that exited while DSM was down', async () => {
      seedRunning(START + 90_000);

      await service.reconcile();

      expect(row()).toMatchObject({ status: 'failed', pendingStopAt: null });
    });

    it('keeps the stored stop when the service closes', async () => {
      await runningServer();
      await service.gracefulStop(SERVER_ID, { delaySec: 60 });

      service.close();
      await vi.advanceTimersByTimeAsync(60_000);

      expect(rcon.commands).not.toContain('#shutdown');
      expect(row().pendingStopAt).toEqual(new Date(START + 10 + 60_000));
    });
  });

  it('formats the delay for the in-game warning', () => {
    expect(formatStopDelay(1)).toBe('1 second');
    expect(formatStopDelay(45)).toBe('45 seconds');
    expect(formatStopDelay(60)).toBe('1 minute');
    expect(formatStopDelay(90)).toBe('1 minute 30 seconds');
    expect(formatStopDelay(121)).toBe('2 minutes 1 second');
    expect(formatStopDelay(3600)).toBe('60 minutes');
    expect(defaultStopWarning(600)).toBe(
      'Server is shutting down in 10 minutes. Please find a safe place and log out.',
    );
  });

  it('maps the pending stop only when complete', () => {
    const at = new Date(START);
    expect(toServerPendingStop({ pendingStopAt: at, pendingStopRequestedAt: at })).toEqual({
      executeAt: at.toISOString(),
      requestedAt: at.toISOString(),
    });
    expect(toServerPendingStop({ pendingStopAt: at, pendingStopRequestedAt: null })).toBeNull();
    expect(toServerPendingStop({ pendingStopAt: null, pendingStopRequestedAt: at })).toBeNull();
  });
});
