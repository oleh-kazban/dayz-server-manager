import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import {
  type ApiErrorCode,
  type ApiErrorParams,
  defaultRestartWarning,
  defaultStopWarning,
  type LaunchPlatform,
  SERVER_EXIT_REASON,
  SERVER_RESTART_FAILED_EVENT,
  SERVER_STATUS,
  SERVER_STATUS_CHANGED_EVENT,
  SERVER_STOP_FAILED_EVENT,
  type ServerExitReason,
  type ServerLastExitDto,
  type ServerPendingStopDto,
  type ServerRestartFailedEventDto,
  type ServerRuntimeDto,
  type ServerStatus,
  type ServerStatusChangedEventDto,
  type ServerStopFailedEventDto,
} from '@aegis/api-contracts';
import {
  type DatabaseInstance,
  type DsmDatabase,
  type NewServer,
  type Server,
  serverMods,
  servers,
} from '@aegis/database';
import {
  type ProcessExit,
  type ProcessIdentity,
  type ProcessManager,
  ProcessSpawnError,
} from '@aegis/platform';
import { BattlEyeRconClient, type RconCommandResult, type RconLoginResult } from '@aegis/rcon';

import { buildLaunchCommandPreview, resolveLaunchPlatform } from './launch-command.service';
import { decryptServerSecrets } from './server-secrets';

/** Default time a new process must survive before `starting` becomes `running` (D2). */
export const DEFAULT_STARTUP_WINDOW_MS = 60_000;
/** Default liveness poll for tracked processes (catches exits of re-adopted processes). */
export const DEFAULT_POLL_INTERVAL_MS = 5_000;
/**
 * Default watchdog after RCON #shutdown before the process is force-killed (DSM-00163). Long on
 * purpose: DayZ saves its persistence while shutting down, and a kill mid-save rolls it back.
 */
export const DEFAULT_STOP_TIMEOUT_MS = 60_000;
/** RCON command that makes DayZ save persistence and exit. */
export const RCON_SHUTDOWN_COMMAND = '#shutdown';
/** RCON command prefix that broadcasts a message to every player (DSM-00167). */
export const RCON_SAY_ALL_COMMAND = '#say -1';
/** Told to players when a pending stop is cancelled (DSM-00167). */
export const STOP_CANCELLED_MESSAGE = 'The server shutdown has been cancelled.';
/** Told to players when a pending restart is cancelled (DSM-00168). */
export const RESTART_CANCELLED_MESSAGE = 'The server restart has been cancelled.';

/** API error code carried by a thrown error (LifecycleError, ConfigStorageError), or `fallback`. */
function errorCodeOf(error: unknown, fallback: string): string {
  const code = (error as { errorCode?: unknown } | null)?.errorCode;
  return typeof code === 'string' ? code : fallback;
}

const ACTIVE: ServerStatus[] = [
  SERVER_STATUS.STARTING,
  SERVER_STATUS.RUNNING,
  SERVER_STATUS.STOPPING,
];
const STARTABLE: ServerStatus[] = [SERVER_STATUS.STOPPED, SERVER_STATUS.FAILED];

export type LifecycleLogger = Pick<FastifyBaseLogger, 'info' | 'warn' | 'error'>;

export interface ServerLifecycleOptions {
  startupWindowMs?: number;
  /** Watchdog after #shutdown before force-killing (default 60 s). */
  stopTimeoutMs?: number;
  pollIntervalMs?: number;
  platform?: LaunchPlatform;
  clock?: () => number;
  logger?: LifecycleLogger;
  /** Event sink, e.g. the SSE hub (`server.status.changed`, `server.stop.failed`). */
  broadcast?: (
    event: string,
    data: ServerStatusChangedEventDto | ServerStopFailedEventDto | ServerRestartFailedEventDto,
  ) => void;
}

export interface GracefulStopOptions {
  /** 0 (default) stops now; otherwise players are warned and the stop runs later (DSM-00167). */
  delaySec?: number;
  /** Replaces the default in-game warning. */
  message?: string;
}

export interface EditLockGuard {
  assertNoActiveEditLock(serverId: string): void;
}

/** The part of an RCON client the graceful stop needs (BattlEyeRconClient implements it). */
export interface RconSession {
  login(): Promise<RconLoginResult>;
  command(text: string): Promise<RconCommandResult>;
  close(): Promise<void>;
}

export type RconSessionFactory = (target: {
  host: string;
  port: number;
  password: string;
}) => RconSession;

export interface ServerLifecycleDeps {
  db: DsmDatabase;
  sqlite: DatabaseInstance['sqlite'];
  processes: ProcessManager;
  locks: EditLockGuard;
  /** Defaults to a real BattlEye RCON client. */
  rcon?: RconSessionFactory;
}

/** RCON bound to all interfaces is reached through loopback (DSM runs on the game host). */
export function rconConnectHost(rconIp: string): string {
  return rconIp === '0.0.0.0' ? '127.0.0.1' : rconIp;
}

const LIFECYCLE_STATUS_CODES: Partial<Record<ApiErrorCode, number>> = {
  SERVER_NOT_FOUND: 404,
  SERVER_ALREADY_RUNNING: 409,
  SERVER_TRANSITION_IN_PROGRESS: 409,
  SERVER_NOT_RUNNING: 409,
  SERVER_LAUNCH_NOT_READY: 422,
  SERVER_START_FAILED: 422,
  SERVER_STOP_FAILED: 500,
  SERVER_RCON_NOT_CONFIGURED: 409,
  SERVER_RCON_UNREACHABLE: 502,
  SERVER_RCON_LOGIN_FAILED: 502,
  SERVER_STOP_ALREADY_PENDING: 409,
  SERVER_STOP_NOT_PENDING: 409,
};

export class LifecycleError extends Error {
  readonly statusCode: number;

  constructor(
    readonly errorCode: ApiErrorCode,
    message: string,
    readonly params?: ApiErrorParams,
  ) {
    super(message);
    this.name = 'LifecycleError';
    this.statusCode = LIFECYCLE_STATUS_CODES[errorCode] ?? 500;
  }
}

export function toServerRuntime(
  server: Pick<Server, 'processPid' | 'processStartedAt'>,
): ServerRuntimeDto | null {
  if (server.processPid === null || server.processStartedAt === null) {
    return null;
  }
  return { pid: server.processPid, startedAt: server.processStartedAt.toISOString() };
}

export function toServerLastExit(
  server: Pick<Server, 'lastExitReason' | 'lastExitCode' | 'lastExitSignal' | 'lastExitAt'>,
): ServerLastExitDto | null {
  if (server.lastExitReason === null || server.lastExitAt === null) {
    return null;
  }
  return {
    reason: server.lastExitReason,
    exitCode: server.lastExitCode,
    signal: server.lastExitSignal,
    at: server.lastExitAt.toISOString(),
  };
}

export function toServerPendingStop(
  server: Pick<Server, 'pendingStopAt' | 'pendingStopRequestedAt'>,
): ServerPendingStopDto | null {
  if (server.pendingStopAt === null || server.pendingStopRequestedAt === null) {
    return null;
  }
  return {
    executeAt: server.pendingStopAt.toISOString(),
    requestedAt: server.pendingStopRequestedAt.toISOString(),
  };
}

const CLEARED_PENDING_STOP = {
  pendingStopAt: null,
  pendingStopRequestedAt: null,
} satisfies Partial<NewServer>;

const CLEARED_RUNTIME = {
  processPid: null,
  processStartToken: null,
  processStartedAt: null,
} satisfies Partial<NewServer>;

function identityOf(server: Server): ProcessIdentity | null {
  return server.processPid !== null && server.processStartToken !== null
    ? { pid: server.processPid, startToken: server.processStartToken }
    : null;
}

function sameIdentity(a: ProcessIdentity, b: ProcessIdentity): boolean {
  return a.pid === b.pid && a.startToken === b.startToken;
}

interface WatchEntry {
  identity: ProcessIdentity;
  startupTimer: ReturnType<typeof setTimeout> | null;
  /** Graceful-stop watchdog (DSM-00163). */
  stopTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Owns every server status transition (DSM-00162): start, force-stop, startup window, crash
 * detection, and re-adoption of processes that survived a DSM restart. SQLite is the source of
 * truth; transitions are conditional updates so concurrent requests cannot both win (GUARD-01).
 * Closing the service never stops game servers (DSM-00160 D1).
 */
export class ServerLifecycleService {
  private readonly watched = new Map<string, WatchEntry>();
  /** Delayed graceful stops waiting to run (DSM-00167); the row in SQLite is the source of truth. */
  private readonly pendingStopTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private polling = false;
  private readonly startupWindowMs: number;
  private readonly stopTimeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly platform: LaunchPlatform;
  private readonly clock: () => number;

  private readonly db: DsmDatabase;
  private readonly sqlite: DatabaseInstance['sqlite'];
  private readonly processes: ProcessManager;
  private readonly locks: EditLockGuard;
  private readonly rcon: RconSessionFactory;

  constructor(
    deps: ServerLifecycleDeps,
    private readonly options: ServerLifecycleOptions = {},
  ) {
    ({ db: this.db, sqlite: this.sqlite, processes: this.processes, locks: this.locks } = deps);
    this.rcon = deps.rcon ?? (target => new BattlEyeRconClient(target));
    this.startupWindowMs = options.startupWindowMs ?? DEFAULT_STARTUP_WINDOW_MS;
    this.stopTimeoutMs = options.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.platform = options.platform ?? resolveLaunchPlatform();
    this.clock = options.clock ?? Date.now;
  }

  /** REQ-01: validates, marks `starting`, spawns the launch command and tracks the process. */
  async start(serverId: string): Promise<Server> {
    const { server, command } = this.sqlite
      .transaction(() => {
        const current = this.requireServer(serverId);
        if (current.status === SERVER_STATUS.RUNNING) {
          throw new LifecycleError(
            'SERVER_ALREADY_RUNNING',
            `"${current.name}" is already running.`,
            {
              name: current.name,
            },
          );
        }
        if (!STARTABLE.includes(current.status)) {
          throw this.busy(current);
        }
        this.locks.assertNoActiveEditLock(serverId);

        const mods = this.db
          .select()
          .from(serverMods)
          .where(eq(serverMods.serverId, serverId))
          .orderBy(asc(serverMods.loadOrder))
          .all();
        const launch = buildLaunchCommandPreview(current, mods, this.platform).command;
        if (!launch.ready) {
          // A not-ready command always carries at least one error issue (compileLaunchCommand).
          const reason = launch.issues.map(issue => issue.message).join(' ');
          throw new LifecycleError('SERVER_LAUNCH_NOT_READY', reason, {
            name: current.name,
            reason,
          });
        }
        this.transition(serverId, STARTABLE, { status: SERVER_STATUS.STARTING });
        return { server: current, command: launch };
      })
      .immediate();

    let managed;
    try {
      managed = await this.processes.spawn({
        executable: command.executable,
        args: command.args,
        cwd: command.cwd,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown spawn error.';
      const exit = error instanceof ProcessSpawnError ? error.details.exit : undefined;
      this.transition(serverId, [SERVER_STATUS.STARTING], {
        status: SERVER_STATUS.FAILED,
        ...CLEARED_RUNTIME,
        ...this.lastExit(SERVER_EXIT_REASON.START_FAILED, exit),
      });
      this.options.logger?.warn({ serverId, reason }, 'DayZ server failed to start');
      throw new LifecycleError('SERVER_START_FAILED', reason, { name: server.name, reason });
    }

    this.transition(serverId, [SERVER_STATUS.STARTING], {
      processPid: managed.identity.pid,
      processStartToken: managed.identity.startToken,
      processStartedAt: managed.startedAt,
    });
    this.watch(serverId, managed.identity, { startupWindow: true, exited: managed.exited });
    this.options.logger?.info(
      { serverId, processPid: managed.identity.pid },
      'DayZ server process started',
    );
    return this.requireServer(serverId);
  }

  /**
   * DSM-00163/00167: graceful stop. With no delay it asks DayZ to save and exit through RCON
   * #shutdown right away (replacing any pending stop). With a delay it warns players once via
   * `#say -1`, keeps the server `running` and persists the stop, which runs when the delay ends.
   */
  async gracefulStop(serverId: string, options: GracefulStopOptions = {}): Promise<Server> {
    const delaySec = options.delaySec ?? 0;
    return delaySec > 0
      ? this.scheduleStop(serverId, delaySec, options.message, false)
      : this.shutdownNow(serverId, false);
  }

  /**
   * DSM-00168: a graceful stop (now or delayed, as `gracefulStop`) that starts the server again
   * once the process has exited. Returns as soon as the stop is requested; the start runs
   * asynchronously and a failure in either phase is broadcast as `server.restart.failed`.
   */
  async restart(serverId: string, options: GracefulStopOptions = {}): Promise<Server> {
    const delaySec = options.delaySec ?? 0;
    return delaySec > 0
      ? this.scheduleStop(serverId, delaySec, options.message, true)
      : this.shutdownNow(serverId, true);
  }

  /** DSM-00167: cancels a pending stop and tells players (best effort, not awaited). */
  async cancelPendingStop(serverId: string): Promise<Server> {
    const current = this.requireServer(serverId);
    const cleared = this.db
      .update(servers)
      .set({ ...CLEARED_PENDING_STOP, restartRequested: false, updatedAt: new Date(this.clock()) })
      .where(and(eq(servers.id, serverId), isNotNull(servers.pendingStopAt)))
      .run();
    if (cleared.changes === 0) {
      throw new LifecycleError(
        'SERVER_STOP_NOT_PENDING',
        `"${current.name}" has no pending stop.`,
        {
          name: current.name,
        },
      );
    }
    this.clearPendingStopTimer(serverId);
    this.broadcastState(serverId);
    this.options.logger?.info(
      { serverId, restart: current.restartRequested },
      'Pending stop cancelled',
    );
    void this.announce(
      current,
      current.restartRequested ? RESTART_CANCELLED_MESSAGE : STOP_CANCELLED_MESSAGE,
    );
    return this.requireServer(serverId);
  }

  /**
   * DSM-00163: asks DayZ to save and exit through RCON #shutdown, then returns with status
   * `stopping`. The exit is applied by the regular exit handling (`stopped`); if the process is
   * still alive after `stopTimeoutMs`, the watchdog force-kills it (`shutdown_timeout`).
   * Nothing changes when RCON cannot be reached or rejects the password.
   */
  private async shutdownNow(serverId: string, restart: boolean): Promise<Server> {
    const current = this.requireServer(serverId);
    const identity = this.requireRunning(current);

    await this.withRcon(current, async session => {
      const stopping = this.transition(serverId, [SERVER_STATUS.RUNNING], {
        status: SERVER_STATUS.STOPPING,
        restartRequested: restart,
      });
      if (!stopping) {
        throw this.busy(this.requireServer(serverId));
      }
      this.armStopWatchdog(serverId, identity);

      const shutdown = await session.command(RCON_SHUTDOWN_COMMAND);
      if (!shutdown.ok) {
        // DayZ may have received it anyway; the watchdog guarantees the stop either way.
        this.options.logger?.warn(
          { serverId, error: shutdown.error },
          'RCON #shutdown was not acknowledged; waiting for the watchdog',
        );
      }
    });

    this.options.logger?.info({ serverId, restart }, 'Graceful stop requested via RCON #shutdown');
    return this.requireServer(serverId);
  }

  /**
   * DSM-00167: reserves the pending stop first (one per server, GUARD-01), then warns players.
   * If the warning cannot be delivered the reservation is rolled back and nothing changes.
   */
  private async scheduleStop(
    serverId: string,
    delaySec: number,
    message: string | undefined,
    restart: boolean,
  ): Promise<Server> {
    const current = this.requireServer(serverId);
    this.requireRunning(current);

    const requestedAt = this.clock();
    const executeAt = requestedAt + delaySec * 1000;
    const reserved = this.db
      .update(servers)
      .set({
        pendingStopAt: new Date(executeAt),
        pendingStopRequestedAt: new Date(requestedAt),
        restartRequested: restart,
        updatedAt: new Date(requestedAt),
      })
      .where(
        and(
          eq(servers.id, serverId),
          eq(servers.status, SERVER_STATUS.RUNNING),
          isNull(servers.pendingStopAt),
        ),
      )
      .run();
    if (reserved.changes === 0) {
      throw this.alreadyPending(current);
    }

    const defaultWarning = restart ? defaultRestartWarning(delaySec) : defaultStopWarning(delaySec);
    const warning = `${RCON_SAY_ALL_COMMAND} ${message ?? defaultWarning}`;
    try {
      await this.withRcon(current, async session => {
        const said = await session.command(warning);
        if (!said.ok) {
          throw new LifecycleError('SERVER_RCON_UNREACHABLE', said.message, {
            name: current.name,
            reason: said.message,
          });
        }
      });
    } catch (error) {
      this.dropPendingStop(serverId, executeAt);
      throw error;
    }

    this.armPendingStop(serverId, executeAt);
    this.broadcastState(serverId);
    this.options.logger?.info({ serverId, delaySec, restart }, 'Delayed graceful stop scheduled');
    return this.requireServer(serverId);
  }

  /** Runs a due pending stop, unless it was cancelled or replaced in the meantime. */
  private async executePendingStop(serverId: string, executeAt: number): Promise<void> {
    this.pendingStopTimers.delete(serverId);
    const server = this.db.select().from(servers).where(eq(servers.id, serverId)).get();
    if (server?.pendingStopAt?.getTime() !== executeAt) {
      return;
    }
    const restart = server.restartRequested;
    try {
      await this.shutdownNow(serverId, restart);
    } catch (error) {
      this.dropPendingStop(serverId, executeAt);
      this.broadcastState(serverId);
      const errorCode = errorCodeOf(error, 'SERVER_STOP_FAILED');
      const message = error instanceof Error ? error.message : 'Unknown stop error.';
      this.options.logger?.error(
        { serverId, errorCode, reason: message, restart },
        restart ? 'Delayed restart failed to stop the server' : 'Delayed stop failed',
      );
      if (restart) {
        this.options.broadcast?.(SERVER_RESTART_FAILED_EVENT, {
          serverId,
          phase: 'stop',
          errorCode,
          message,
        });
      } else {
        this.options.broadcast?.(SERVER_STOP_FAILED_EVENT, { serverId, errorCode, message });
      }
    }
  }

  /** DSM-00168: the stop of a restart completed; start again and report a failed start. */
  private async restartAfterStop(serverId: string): Promise<void> {
    this.options.logger?.info({ serverId }, 'Restarting DayZ server after the graceful stop');
    try {
      await this.start(serverId);
    } catch (error) {
      const errorCode = errorCodeOf(error, 'SERVER_START_FAILED');
      const message = error instanceof Error ? error.message : 'Unknown start error.';
      this.options.logger?.error(
        { serverId, errorCode, reason: message },
        'Restart failed to start the server',
      );
      this.options.broadcast?.(SERVER_RESTART_FAILED_EVENT, {
        serverId,
        phase: 'start',
        errorCode,
        message,
      });
    }
  }

  /** Clears the pending stop only while it is still the one scheduled for `executeAt`. */
  private dropPendingStop(serverId: string, executeAt: number): void {
    this.db
      .update(servers)
      .set({ ...CLEARED_PENDING_STOP, restartRequested: false })
      .where(and(eq(servers.id, serverId), eq(servers.pendingStopAt, new Date(executeAt))))
      .run();
  }

  private armPendingStop(serverId: string, executeAt: number): void {
    this.clearPendingStopTimer(serverId);
    const timer = setTimeout(
      () => {
        void this.executePendingStop(serverId, executeAt);
      },
      Math.max(0, executeAt - this.clock()),
    );
    timer.unref();
    this.pendingStopTimers.set(serverId, timer);
  }

  private clearPendingStopTimer(serverId: string): void {
    const timer = this.pendingStopTimers.get(serverId);
    if (timer) {
      clearTimeout(timer);
      this.pendingStopTimers.delete(serverId);
    }
  }

  /** Best-effort in-game message; failures are only logged. */
  private async announce(server: Server, message: string): Promise<void> {
    try {
      await this.withRcon(server, async session => {
        const said = await session.command(`${RCON_SAY_ALL_COMMAND} ${message}`);
        if (!said.ok) {
          throw new Error(said.message);
        }
      });
    } catch (error) {
      this.options.logger?.warn(
        { serverId: server.id, reason: error instanceof Error ? error.message : String(error) },
        'In-game announcement failed',
      );
    }
  }

  /** The tracked process of a `running` server, or the reason it cannot be stopped. */
  private requireRunning(server: Server): ProcessIdentity {
    const identity = identityOf(server);
    if (server.status === SERVER_STATUS.STARTING || server.status === SERVER_STATUS.STOPPING) {
      throw this.busy(server);
    }
    if (server.status !== SERVER_STATUS.RUNNING || !identity) {
      throw new LifecycleError('SERVER_NOT_RUNNING', `"${server.name}" has no running process.`, {
        name: server.name,
      });
    }
    return identity;
  }

  /** Opens an RCON session for `server`, maps login failures to API errors, always closes it. */
  private async withRcon<T>(server: Server, run: (session: RconSession) => Promise<T>): Promise<T> {
    const secrets = decryptServerSecrets(server);
    if (!secrets.ok) {
      throw new LifecycleError(secrets.errorCode, secrets.message);
    }
    const password = secrets.secrets.rconPassword;
    if (!password) {
      throw new LifecycleError(
        'SERVER_RCON_NOT_CONFIGURED',
        `"${server.name}" has no BattlEye RCON password.`,
        { name: server.name },
      );
    }

    const session = this.rcon({
      host: rconConnectHost(server.rconIp),
      port: server.rconPort,
      password,
    });
    try {
      const login = await session.login();
      if (!login.ok) {
        const code =
          login.error === 'login_failed' ? 'SERVER_RCON_LOGIN_FAILED' : 'SERVER_RCON_UNREACHABLE';
        throw new LifecycleError(code, login.message, {
          name: server.name,
          reason: login.message,
        });
      }
      return await run(session);
    } finally {
      await session.close();
    }
  }

  private alreadyPending(server: Server): LifecycleError {
    return new LifecycleError(
      'SERVER_STOP_ALREADY_PENDING',
      `A stop is already scheduled for "${server.name}". Cancel it first.`,
      { name: server.name },
    );
  }

  /** REQ-04: kills the process tree without the RCON persistence flush. */
  async forceStop(serverId: string): Promise<Server> {
    const current = this.requireServer(serverId);
    const identity = identityOf(current);
    if (!identity || !ACTIVE.includes(current.status)) {
      throw new LifecycleError('SERVER_NOT_RUNNING', `"${current.name}" has no running process.`, {
        name: current.name,
      });
    }

    const previous = current.status;
    this.unwatch(serverId);
    this.transition(serverId, [previous], { status: SERVER_STATUS.STOPPING });
    try {
      await this.processes.killTree(identity);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown kill error.';
      this.transition(serverId, [SERVER_STATUS.STOPPING], { status: previous });
      this.watch(serverId, identity, { startupWindow: previous === SERVER_STATUS.STARTING });
      this.options.logger?.error({ serverId, reason }, 'Force-stop failed');
      throw new LifecycleError('SERVER_STOP_FAILED', reason, { name: current.name, reason });
    }

    this.transition(serverId, [SERVER_STATUS.STOPPING], {
      status: SERVER_STATUS.STOPPED,
      ...CLEARED_RUNTIME,
      ...this.lastExit(SERVER_EXIT_REASON.FORCE_STOPPED),
    });
    this.options.logger?.info({ serverId }, 'DayZ server force-stopped');
    return this.requireServer(serverId);
  }

  /** REQ-05: aligns stored state with the OS after DSM (re)starts; adopts surviving processes. */
  async reconcile(): Promise<void> {
    for (const server of this.db.select().from(servers).all()) {
      const identity = identityOf(server);
      if (!identity) {
        if (ACTIVE.includes(server.status)) {
          this.transition(server.id, [server.status], { status: SERVER_STATUS.STOPPED });
        }
        continue;
      }

      if (await this.isAliveSafe(server.id, identity)) {
        this.readopt(server, identity);
      } else {
        this.recordOfflineExit(server);
      }
    }
  }

  /**
   * A tracked process ended while DSM was down: a stop that was in progress completed (and a
   * requested restart starts the server again, DSM-00168); anything else is an unexpected exit.
   */
  private recordOfflineExit(server: Server): void {
    const wasStopping = server.status === SERVER_STATUS.STOPPING;
    const exited = this.transition(server.id, [server.status], {
      status: wasStopping ? SERVER_STATUS.STOPPED : SERVER_STATUS.FAILED,
      ...CLEARED_RUNTIME,
      ...this.lastExit(
        wasStopping ? SERVER_EXIT_REASON.STOPPED : SERVER_EXIT_REASON.EXITED_WHILE_OFFLINE,
      ),
    });
    if (exited && wasStopping && server.restartRequested) {
      void this.restartAfterStop(server.id);
    }
  }

  /** Tracks a process that survived a DSM restart and resumes its pending stop (DSM-00167). */
  private readopt(server: Server, identity: ProcessIdentity): void {
    this.transition(server.id, [server.status], { status: SERVER_STATUS.RUNNING });
    this.watch(server.id, identity, { startupWindow: false });
    this.options.logger?.info(
      { serverId: server.id, processPid: identity.pid },
      'Re-adopted DayZ server',
    );
    if (server.pendingStopAt) {
      // Runs right away when the stop came due while DSM was down (REQ-08).
      this.armPendingStop(server.id, server.pendingStopAt.getTime());
      this.options.logger?.info(
        { serverId: server.id, executeAt: server.pendingStopAt.toISOString() },
        'Resumed pending stop',
      );
    }
  }

  /**
   * Stops timers only; tracked game servers keep running (DSM-00160 D1) and pending stops stay
   * stored, to be resumed by the next `reconcile` (DSM-00167).
   */
  close(): void {
    for (const serverId of [...this.watched.keys()]) {
      this.unwatch(serverId);
    }
    for (const serverId of [...this.pendingStopTimers.keys()]) {
      this.clearPendingStopTimer(serverId);
    }
  }

  /** Number of tracked processes (diagnostics and tests). */
  get watchedCount(): number {
    return this.watched.size;
  }

  private watch(
    serverId: string,
    identity: ProcessIdentity,
    options: { startupWindow: boolean; exited?: Promise<ProcessExit> },
  ): void {
    this.unwatch(serverId);
    const startupTimer = options.startupWindow
      ? setTimeout(() => {
          void this.promoteToRunning(serverId, identity);
        }, this.startupWindowMs)
      : null;
    startupTimer?.unref();
    this.watched.set(serverId, { identity, startupTimer, stopTimer: null });

    void options.exited?.then(exit => this.handleExit(serverId, identity, exit));

    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => {
        void this.pollOnce();
      }, this.pollIntervalMs);
      this.pollTimer.unref();
    }
  }

  private unwatch(serverId: string): void {
    const entry = this.watched.get(serverId);
    if (entry?.startupTimer) {
      clearTimeout(entry.startupTimer);
    }
    if (entry?.stopTimer) {
      clearTimeout(entry.stopTimer);
    }
    this.watched.delete(serverId);
    if (this.watched.size === 0 && this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private isWatching(serverId: string, identity: ProcessIdentity): boolean {
    const entry = this.watched.get(serverId);
    return entry !== undefined && sameIdentity(entry.identity, identity);
  }

  /** Starts the graceful-stop watchdog on the tracked process (tracking it first if needed). */
  private armStopWatchdog(serverId: string, identity: ProcessIdentity): void {
    if (!this.isWatching(serverId, identity)) {
      this.watch(serverId, identity, { startupWindow: false });
    }
    const entry = this.watched.get(serverId) as WatchEntry;
    entry.stopTimer = setTimeout(() => {
      void this.onStopTimeout(serverId, identity);
    }, this.stopTimeoutMs);
    entry.stopTimer.unref();
  }

  /**
   * The process ignored #shutdown for `stopTimeoutMs`: force-kill it and record why. No staleness
   * check is needed because an exit (or a force-stop) unwatches and clears this timer first.
   */
  private async onStopTimeout(serverId: string, identity: ProcessIdentity): Promise<void> {
    this.unwatch(serverId);
    try {
      await this.processes.killTree(identity);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown kill error.';
      this.options.logger?.error({ serverId, reason }, 'Watchdog kill after #shutdown failed');
      // Keep tracking so a later exit is still detected; the admin can force-stop.
      this.watch(serverId, identity, { startupWindow: false });
      return;
    }
    const restart = this.requireServer(serverId).restartRequested;
    const stopped = this.transition(serverId, [SERVER_STATUS.STOPPING], {
      status: SERVER_STATUS.STOPPED,
      ...CLEARED_RUNTIME,
      ...this.lastExit(SERVER_EXIT_REASON.SHUTDOWN_TIMEOUT),
    });
    this.options.logger?.warn(
      { serverId, stopTimeoutMs: this.stopTimeoutMs },
      'DayZ did not exit after #shutdown; force-killed by the watchdog',
    );
    if (stopped && restart) {
      void this.restartAfterStop(serverId);
    }
  }

  /** REQ-02: `starting` → `running` once the process survived the startup window. */
  private async promoteToRunning(serverId: string, identity: ProcessIdentity): Promise<void> {
    // No staleness check needed: unwatch() always clears this timer first.
    if (await this.isAliveSafe(serverId, identity)) {
      this.transition(serverId, [SERVER_STATUS.STARTING], { status: SERVER_STATUS.RUNNING });
    } else {
      await this.handleExit(serverId, identity, null);
    }
  }

  /** Detects exits of tracked processes, including re-adopted ones without an exit event. */
  private async pollOnce(): Promise<void> {
    if (this.polling) {
      return;
    }
    this.polling = true;
    try {
      for (const [serverId, entry] of [...this.watched]) {
        if (!this.processes.isPidRunning(entry.identity.pid)) {
          await this.handleExit(serverId, entry.identity, null);
        }
      }
    } finally {
      this.polling = false;
    }
  }

  /** REQ-02/03: applies an exit only while it still describes the tracked process (GUARD-03). */
  private async handleExit(
    serverId: string,
    identity: ProcessIdentity,
    exit: ProcessExit | null,
  ): Promise<void> {
    if (!this.isWatching(serverId, identity)) {
      return;
    }
    this.unwatch(serverId);

    const server = this.db.select().from(servers).where(eq(servers.id, serverId)).get();
    const stored = server && identityOf(server);
    if (!server || !stored || !sameIdentity(stored, identity)) {
      return;
    }

    const outcome: Record<ServerStatus, [ServerStatus, ServerExitReason]> = {
      [SERVER_STATUS.STARTING]: [SERVER_STATUS.FAILED, SERVER_EXIT_REASON.START_FAILED],
      [SERVER_STATUS.RUNNING]: [SERVER_STATUS.FAILED, SERVER_EXIT_REASON.CRASHED],
      [SERVER_STATUS.STOPPING]: [SERVER_STATUS.STOPPED, SERVER_EXIT_REASON.STOPPED],
      [SERVER_STATUS.STOPPED]: [SERVER_STATUS.STOPPED, SERVER_EXIT_REASON.STOPPED],
      [SERVER_STATUS.FAILED]: [SERVER_STATUS.FAILED, SERVER_EXIT_REASON.CRASHED],
    };
    const [status, reason] = outcome[server.status];
    const exited = this.transition(serverId, [server.status], {
      status,
      ...CLEARED_RUNTIME,
      ...this.lastExit(reason, exit ?? undefined),
    });
    this.options.logger?.warn(
      { serverId, reason, exitCode: exit?.code ?? null, signal: exit?.signal ?? null },
      'DayZ server process exited',
    );
    // DSM-00168: the graceful stop of a restart completed.
    if (exited && server.status === SERVER_STATUS.STOPPING && server.restartRequested) {
      void this.restartAfterStop(serverId);
    }
  }

  private async isAliveSafe(serverId: string, identity: ProcessIdentity): Promise<boolean> {
    try {
      return await this.processes.isAlive(identity);
    } catch (error) {
      // Identity lookup failed (e.g. PowerShell unavailable): fall back to the PID check.
      this.options.logger?.warn(
        { serverId, error: error instanceof Error ? error.message : String(error) },
        'Process identity check failed; using PID liveness',
      );
      return this.processes.isPidRunning(identity.pid);
    }
  }

  /**
   * Conditional status/field update (GUARD-01); broadcasts when the status changed. Leaving
   * `running` also drops a pending stop (DSM-00167 REQ-07).
   */
  private transition(
    serverId: string,
    from: readonly ServerStatus[],
    set: Partial<NewServer>,
  ): boolean {
    const leavesRunning = set.status !== undefined && set.status !== SERVER_STATUS.RUNNING;
    // A restart lives through `stopping` only; any other new status ends it (DSM-00168 REQ-06).
    const endsRestart = leavesRunning && set.status !== SERVER_STATUS.STOPPING;
    const result = this.db
      .update(servers)
      .set({
        ...set,
        ...(leavesRunning ? CLEARED_PENDING_STOP : {}),
        ...(endsRestart ? { restartRequested: false } : {}),
        updatedAt: new Date(this.clock()),
      })
      .where(and(eq(servers.id, serverId), inArray(servers.status, [...from])))
      .run();
    const changed = result.changes > 0;
    if (changed && leavesRunning) {
      this.clearPendingStopTimer(serverId);
    }
    if (changed && set.status) {
      this.broadcastState(serverId);
    }
    return changed;
  }

  /** `server.status.changed` with the current status, last exit and pending stop. */
  private broadcastState(serverId: string): void {
    if (!this.options.broadcast) {
      return;
    }
    const server = this.requireServer(serverId);
    this.options.broadcast(SERVER_STATUS_CHANGED_EVENT, {
      serverId,
      status: server.status,
      lastExit: toServerLastExit(server),
      pendingStop: toServerPendingStop(server),
      restartRequested: server.restartRequested,
    });
  }

  private lastExit(reason: ServerExitReason, exit?: ProcessExit): Partial<NewServer> {
    return {
      lastExitReason: reason,
      lastExitCode: exit?.code ?? null,
      lastExitSignal: exit?.signal ?? null,
      lastExitAt: new Date(this.clock()),
    };
  }

  private requireServer(serverId: string): Server {
    const server = this.db.select().from(servers).where(eq(servers.id, serverId)).get();
    if (!server) {
      throw new LifecycleError('SERVER_NOT_FOUND', `Server with ID '${serverId}' not found`, {
        id: serverId,
      });
    }
    return server;
  }

  private busy(server: Server): LifecycleError {
    return new LifecycleError(
      'SERVER_TRANSITION_IN_PROGRESS',
      `"${server.name}" is ${server.status}.`,
      { name: server.name, status: server.status },
    );
  }
}
