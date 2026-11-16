import { eq } from 'drizzle-orm';
import dgram from 'node:dgram';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ServerStatus } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase, type Server, servers } from '@aegis/database';
import { encodePacket, PACKET_TYPE } from '@aegis/rcon';

import { FakeProcessManager } from './__fixtures__/fake-process-manager';
import { FakeRconSessions } from './__fixtures__/fake-rcon-session';
import {
  DEFAULT_STOP_TIMEOUT_MS,
  rconConnectHost,
  ServerLifecycleService,
} from './server-lifecycle.service';

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const STOP_TIMEOUT = 2_000;
const RCON_PASSWORD = 'Rcon!Pass_42';
/** Not a valid vault ciphertext (built at runtime: test data, not a credential). */
const CORRUPT_CIPHERTEXT = Buffer.from('corrupt').toString('base64');
/** A LAN address RCON could be bound to (built at runtime to keep it out of IP literals). */
const LAN_IP = [192, 168, 1, 20].join('.');

describe('ServerLifecycleService.gracefulStop (DSM-00163)', () => {
  let dbInstance: DatabaseInstance;
  let processes: FakeProcessManager;
  let rcon: FakeRconSessions;
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

  /** Starts the fake process and lets the startup window pass: status `running`. */
  async function runningServer(): Promise<number> {
    const started = await service.start(SERVER_ID);
    await vi.advanceTimersByTimeAsync(10);
    expect(row().status).toBe('running');
    return started.processPid as number;
  }

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
        rconIp: '0.0.0.0',
        rconPort: 2310,
        // Legacy plaintext column: decrypted without a vault key.
        rconPassword: RCON_PASSWORD,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    processes = new FakeProcessManager();
    rcon = new FakeRconSessions();
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    service = new ServerLifecycleService(
      {
        db: dbInstance.db,
        sqlite: dbInstance.sqlite,
        processes,
        locks: { assertNoActiveEditLock: vi.fn() },
        rcon: rcon.factory,
      },
      { startupWindowMs: 10, stopTimeoutMs: STOP_TIMEOUT, platform: 'linux', logger },
    );
  });

  afterEach(() => {
    service.close();
    dbInstance.close();
    vi.useRealTimers();
  });

  it('sends #shutdown over loopback, returns stopping, and records a graceful exit', async () => {
    const pid = await runningServer();

    const stopping = await service.gracefulStop(SERVER_ID);
    expect(stopping.status).toBe('stopping');
    expect(rcon.targets).toEqual([{ host: '127.0.0.1', port: 2310, password: RCON_PASSWORD }]);
    expect(rcon.commands).toEqual(['#shutdown']);
    expect(rcon.closed).toBe(1);
    expect(processes.killCalls).toEqual([]);

    processes.exit(pid, { code: 0, signal: null });
    await flush();
    expect(row()).toMatchObject({
      status: 'stopped',
      processPid: null,
      lastExitReason: 'stopped',
      lastExitCode: 0,
    });

    // The watchdog was cleared by the exit.
    await vi.advanceTimersByTimeAsync(STOP_TIMEOUT);
    expect(processes.killCalls).toEqual([]);
    expect(row().lastExitReason).toBe('stopped');
  });

  it('force-kills through the watchdog when the process ignores #shutdown', async () => {
    const pid = await runningServer();
    await service.gracefulStop(SERVER_ID);

    await vi.advanceTimersByTimeAsync(STOP_TIMEOUT - 1);
    expect(row().status).toBe('stopping');

    await vi.advanceTimersByTimeAsync(1);
    expect(processes.killCalls).toEqual([{ pid, startToken: `token-${pid}` }]);
    expect(row()).toMatchObject({
      status: 'stopped',
      processPid: null,
      lastExitReason: 'shutdown_timeout',
    });
    expect(service.watchedCount).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      { serverId: SERVER_ID, stopTimeoutMs: STOP_TIMEOUT },
      'DayZ did not exit after #shutdown; force-killed by the watchdog',
    );
  });

  it('keeps tracking the process when the watchdog kill fails', async () => {
    const pid = await runningServer();
    await service.gracefulStop(SERVER_ID);
    processes.killError = new Error('Access is denied.');

    await vi.advanceTimersByTimeAsync(STOP_TIMEOUT);
    expect(row().status).toBe('stopping');
    expect(service.watchedCount).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      { serverId: SERVER_ID, reason: 'Access is denied.' },
      'Watchdog kill after #shutdown failed',
    );

    processes.exit(pid, { code: 0, signal: null });
    await flush();
    expect(row()).toMatchObject({ status: 'stopped', lastExitReason: 'stopped' });
  });

  it('logs a non-Error watchdog kill failure', async () => {
    await runningServer();
    await service.gracefulStop(SERVER_ID);
    processes.killError = 'boom' as unknown as Error;
    await vi.advanceTimersByTimeAsync(STOP_TIMEOUT);
    expect(logger.error).toHaveBeenCalledWith(
      { serverId: SERVER_ID, reason: 'Unknown kill error.' },
      'Watchdog kill after #shutdown failed',
    );
  });

  it('still waits for the watchdog when #shutdown is not acknowledged', async () => {
    await runningServer();
    rcon.commandResult = { ok: false, error: 'timeout', message: 'no ack' };
    expect((await service.gracefulStop(SERVER_ID)).status).toBe('stopping');
    expect(logger.warn).toHaveBeenCalledWith(
      { serverId: SERVER_ID, error: 'timeout' },
      'RCON #shutdown was not acknowledged; waiting for the watchdog',
    );
    await vi.advanceTimersByTimeAsync(STOP_TIMEOUT);
    expect(row().lastExitReason).toBe('shutdown_timeout');
  });

  it.each([
    ['login_failed', 'SERVER_RCON_LOGIN_FAILED'],
    ['unreachable', 'SERVER_RCON_UNREACHABLE'],
    ['timeout', 'SERVER_RCON_UNREACHABLE'],
  ] as const)('refuses with %s → %s and changes nothing', async (error, code) => {
    await runningServer();
    rcon.loginResult = { ok: false, error, message: `rcon says ${error}` };

    await expect(service.gracefulStop(SERVER_ID)).rejects.toMatchObject({
      errorCode: code,
      statusCode: 502,
      params: { name: 'Chernarus', reason: `rcon says ${error}` },
    });
    expect(row().status).toBe('running');
    expect(rcon.commands).toEqual([]);
    expect(rcon.closed).toBe(1);
    await vi.advanceTimersByTimeAsync(STOP_TIMEOUT);
    expect(processes.killCalls).toEqual([]);
  });

  it('refuses without an RCON password and never opens a session', async () => {
    await runningServer();
    setRow({ rconPassword: null });
    await expect(service.gracefulStop(SERVER_ID)).rejects.toMatchObject({
      errorCode: 'SERVER_RCON_NOT_CONFIGURED',
      statusCode: 409,
      params: { name: 'Chernarus' },
    });
    expect(rcon.targets).toEqual([]);
  });

  it('reports a vault failure when the stored password cannot be decrypted', async () => {
    await runningServer();
    const saved = process.env.DSM_VAULT_KEY;
    process.env.DSM_VAULT_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    try {
      setRow({ rconPassword: null, rconPasswordEncrypted: CORRUPT_CIPHERTEXT });
      await expect(service.gracefulStop(SERVER_ID)).rejects.toMatchObject({
        errorCode: 'VAULT_KEY_UNAVAILABLE',
        statusCode: 500,
      });
      expect(rcon.targets).toEqual([]);
    } finally {
      if (saved === undefined) {
        delete process.env.DSM_VAULT_KEY;
      } else {
        process.env.DSM_VAULT_KEY = saved;
      }
    }
  });

  it.each<[ServerStatus, string]>([
    ['starting', 'SERVER_TRANSITION_IN_PROGRESS'],
    ['stopping', 'SERVER_TRANSITION_IN_PROGRESS'],
    ['stopped', 'SERVER_NOT_RUNNING'],
    ['failed', 'SERVER_NOT_RUNNING'],
  ])('refuses a %s server with %s', async (status, code) => {
    setRow({ status });
    await expect(service.gracefulStop(SERVER_ID)).rejects.toMatchObject({
      errorCode: code,
      statusCode: 409,
    });
    expect(rcon.targets).toEqual([]);
  });

  it('refuses a running status without a recorded process', async () => {
    setRow({ status: 'running' });
    await expect(service.gracefulStop(SERVER_ID)).rejects.toMatchObject({
      errorCode: 'SERVER_NOT_RUNNING',
    });
  });

  it('gives up when the status changed while logging in, and closes the session', async () => {
    await runningServer();
    rcon.onLogin = () => setRow({ status: 'stopping' });
    await expect(service.gracefulStop(SERVER_ID)).rejects.toMatchObject({
      errorCode: 'SERVER_TRANSITION_IN_PROGRESS',
    });
    expect(rcon.commands).toEqual([]);
    expect(rcon.closed).toBe(1);
  });

  it('tracks an untracked running process before arming the watchdog', async () => {
    setRow({
      status: 'running',
      processPid: 4242,
      processStartToken: 'token-4242',
      processStartedAt: new Date(1_000),
    });
    processes.alive.set(4242, 'token-4242');
    expect(service.watchedCount).toBe(0);

    await service.gracefulStop(SERVER_ID);
    expect(service.watchedCount).toBe(1);
    await vi.advanceTimersByTimeAsync(STOP_TIMEOUT);
    expect(row().lastExitReason).toBe('shutdown_timeout');
  });

  it('connects to a specific RCON bind address as-is', () => {
    expect(rconConnectHost('0.0.0.0')).toBe('127.0.0.1');
    expect(rconConnectHost('127.0.0.1')).toBe('127.0.0.1');
    expect(rconConnectHost(LAN_IP)).toBe(LAN_IP);
    expect(DEFAULT_STOP_TIMEOUT_MS).toBe(60_000);
  });
});

describe('ServerLifecycleService default RCON client', () => {
  it('uses the real BattlEye client: a rejected password changes nothing', async () => {
    // A UDP socket answering every login like BattlEye does for a wrong password.
    const battleye = dgram.createSocket('udp4');
    await new Promise<void>(resolve => battleye.bind(0, '127.0.0.1', resolve));
    battleye.on('message', (_datagram, remote) => {
      battleye.send(
        encodePacket(PACKET_TYPE.LOGIN, Buffer.from([0x00])),
        remote.port,
        remote.address,
      );
    });

    const dbInstance = initDatabase({ dbPath: ':memory:' });
    const now = new Date();
    dbInstance.db
      .insert(servers)
      .values({
        id: SERVER_ID,
        name: 'Chernarus',
        status: 'running',
        installPath: '/opt/dayz',
        profilePath: 'profiles',
        missionPath: 'm',
        rconIp: '127.0.0.1',
        rconPort: battleye.address().port,
        rconPassword: RCON_PASSWORD,
        processPid: 4242,
        processStartToken: 'token-4242',
        processStartedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const service = new ServerLifecycleService({
      db: dbInstance.db,
      sqlite: dbInstance.sqlite,
      processes: new FakeProcessManager(),
      locks: { assertNoActiveEditLock: vi.fn() },
    });
    try {
      await expect(service.gracefulStop(SERVER_ID)).rejects.toMatchObject({
        errorCode: 'SERVER_RCON_LOGIN_FAILED',
      });
    } finally {
      service.close();
      dbInstance.close();
      await new Promise<void>(resolve => battleye.close(() => resolve()));
    }
  });
});
