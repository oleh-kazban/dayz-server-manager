import { and, asc, eq, inArray } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import {
  type ApiErrorCode,
  type ApiErrorParams,
  type LaunchPlatform,
  SERVER_EXIT_REASON,
  SERVER_STATUS,
  SERVER_STATUS_CHANGED_EVENT,
  type ServerExitReason,
  type ServerLastExitDto,
  type ServerRuntimeDto,
  type ServerStatus,
  type ServerStatusChangedEventDto,
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

import { buildLaunchCommandPreview, resolveLaunchPlatform } from './launch-command.service';

/** Default time a new process must survive before `starting` becomes `running` (D2). */
export const DEFAULT_STARTUP_WINDOW_MS = 60_000;
/** Default liveness poll for tracked processes (catches exits of re-adopted processes). */
export const DEFAULT_POLL_INTERVAL_MS = 5_000;

const ACTIVE: ServerStatus[] = [
  SERVER_STATUS.STARTING,
  SERVER_STATUS.RUNNING,
  SERVER_STATUS.STOPPING,
];
const STARTABLE: ServerStatus[] = [SERVER_STATUS.STOPPED, SERVER_STATUS.FAILED];

export type LifecycleLogger = Pick<FastifyBaseLogger, 'info' | 'warn' | 'error'>;

export interface ServerLifecycleOptions {
  startupWindowMs?: number;
  pollIntervalMs?: number;
  platform?: LaunchPlatform;
  clock?: () => number;
  logger?: LifecycleLogger;
  /** Status change sink, e.g. the SSE hub (`server.status.changed`). */
  broadcast?: (event: string, data: ServerStatusChangedEventDto) => void;
}

export interface EditLockGuard {
  assertNoActiveEditLock(serverId: string): void;
}

export interface ServerLifecycleDeps {
  db: DsmDatabase;
  sqlite: DatabaseInstance['sqlite'];
  processes: ProcessManager;
  locks: EditLockGuard;
}

const LIFECYCLE_STATUS_CODES: Partial<Record<ApiErrorCode, number>> = {
  SERVER_NOT_FOUND: 404,
  SERVER_ALREADY_RUNNING: 409,
  SERVER_TRANSITION_IN_PROGRESS: 409,
  SERVER_NOT_RUNNING: 409,
  SERVER_LAUNCH_NOT_READY: 422,
  SERVER_START_FAILED: 422,
  SERVER_STOP_FAILED: 500,
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
}

/**
 * Owns every server status transition (DSM-00162): start, force-stop, startup window, crash
 * detection, and re-adoption of processes that survived a DSM restart. SQLite is the source of
 * truth; transitions are conditional updates so concurrent requests cannot both win (GUARD-01).
 * Closing the service never stops game servers (DSM-00160 D1).
 */
export class ServerLifecycleService {
  private readonly watched = new Map<string, WatchEntry>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private polling = false;
  private readonly startupWindowMs: number;
  private readonly pollIntervalMs: number;
  private readonly platform: LaunchPlatform;
  private readonly clock: () => number;

  private readonly db: DsmDatabase;
  private readonly sqlite: DatabaseInstance['sqlite'];
  private readonly processes: ProcessManager;
  private readonly locks: EditLockGuard;

  constructor(
    deps: ServerLifecycleDeps,
    private readonly options: ServerLifecycleOptions = {},
  ) {
    ({ db: this.db, sqlite: this.sqlite, processes: this.processes, locks: this.locks } = deps);
    this.startupWindowMs = options.startupWindowMs ?? DEFAULT_STARTUP_WINDOW_MS;
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
        this.transition(server.id, [server.status], { status: SERVER_STATUS.RUNNING });
        this.watch(server.id, identity, { startupWindow: false });
        this.options.logger?.info(
          { serverId: server.id, processPid: identity.pid },
          'Re-adopted DayZ server',
        );
      } else {
        const wasStopping = server.status === SERVER_STATUS.STOPPING;
        this.transition(server.id, [server.status], {
          status: wasStopping ? SERVER_STATUS.STOPPED : SERVER_STATUS.FAILED,
          ...CLEARED_RUNTIME,
          ...this.lastExit(
            wasStopping ? SERVER_EXIT_REASON.STOPPED : SERVER_EXIT_REASON.EXITED_WHILE_OFFLINE,
          ),
        });
      }
    }
  }

  /** Stops timers only; tracked game servers keep running (DSM-00160 D1). */
  close(): void {
    for (const serverId of [...this.watched.keys()]) {
      this.unwatch(serverId);
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
    this.watched.set(serverId, { identity, startupTimer });

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
    this.transition(serverId, [server.status], {
      status,
      ...CLEARED_RUNTIME,
      ...this.lastExit(reason, exit ?? undefined),
    });
    this.options.logger?.warn(
      { serverId, reason, exitCode: exit?.code ?? null, signal: exit?.signal ?? null },
      'DayZ server process exited',
    );
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

  /** Conditional status/field update (GUARD-01); broadcasts when the status changed. */
  private transition(
    serverId: string,
    from: readonly ServerStatus[],
    set: Partial<NewServer>,
  ): boolean {
    const result = this.db
      .update(servers)
      .set({ ...set, updatedAt: new Date(this.clock()) })
      .where(and(eq(servers.id, serverId), inArray(servers.status, [...from])))
      .run();
    const changed = result.changes > 0;
    if (changed && set.status && this.options.broadcast) {
      const server = this.requireServer(serverId);
      this.options.broadcast(SERVER_STATUS_CHANGED_EVENT, {
        serverId,
        status: server.status,
        lastExit: toServerLastExit(server),
      });
    }
    return changed;
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
