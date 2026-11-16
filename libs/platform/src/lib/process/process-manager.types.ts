/** What to run. Mirrors the DSM-00125 launch contract: an argument array, never a shell string. */
export interface SpawnSpec {
  executable: string;
  args: readonly string[];
  cwd: string;
  /** Defaults to the DSM process environment. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Durable handle to an OS process. `startToken` is derived from the OS process start time, so a
 * recycled PID never matches an old identity. Persist both values to re-adopt a process after DSM
 * restarts (DSM-00162).
 */
export interface ProcessIdentity {
  pid: number;
  startToken: string;
}

export interface ProcessExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

/** A process spawned by this DSM instance. `exited` only settles while DSM is its parent. */
export interface ManagedProcess {
  identity: ProcessIdentity;
  startedAt: Date;
  exited: Promise<ProcessExit>;
}

export type KillResult = 'killed' | 'not_running' | 'identity_mismatch';

export interface KillTreeOptions {
  /** Linux: time between SIGTERM and SIGKILL to the process group. Ignored on Windows (force). */
  graceMs?: number;
}

export interface ProcessManager {
  /**
   * Starts a process detached from DSM (survives DSM exit, stdio ignored), with `shell: false`.
   * Rejects with `ProcessSpawnError` when the OS cannot start it or it exits before its identity
   * could be read.
   */
  spawn(spec: SpawnSpec): Promise<ManagedProcess>;
  /** Identity of a running process, or `null` when no process has this PID. */
  readIdentity(pid: number): Promise<ProcessIdentity | null>;
  /** True only when the PID is running and still belongs to the same process. */
  isAlive(identity: ProcessIdentity): Promise<boolean>;
  /** Cheap PID existence check for frequent polling; does not verify identity. */
  isPidRunning(pid: number): boolean;
  /** Kills the process and every descendant. Never signals a PID whose identity changed. */
  killTree(identity: ProcessIdentity, options?: KillTreeOptions): Promise<KillResult>;
}

export type ProcessSpawnErrorCode = 'SPAWN_FAILED' | 'SPAWN_EXITED_EARLY';

export class ProcessSpawnError extends Error {
  constructor(
    readonly code: ProcessSpawnErrorCode,
    message: string,
    readonly details: { osCode?: string; exit?: ProcessExit } = {},
  ) {
    super(message);
    this.name = 'ProcessSpawnError';
  }
}

export class ProcessKillError extends Error {
  readonly code = 'KILL_FAILED';

  constructor(
    message: string,
    readonly details: { pid: number; osCode?: string; output?: string },
  ) {
    super(message);
    this.name = 'ProcessKillError';
  }
}
