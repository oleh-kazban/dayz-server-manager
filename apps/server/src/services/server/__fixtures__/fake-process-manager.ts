import type {
  KillResult,
  ManagedProcess,
  ProcessExit,
  ProcessIdentity,
  ProcessManager,
  SpawnSpec,
} from '@aegis/platform';

/**
 * In-memory ProcessManager for lifecycle tests: deterministic PIDs (from 1000) and tokens,
 * controllable exits, and injectable failures.
 */
export class FakeProcessManager implements ProcessManager {
  readonly alive = new Map<number, string>();
  readonly spawnCalls: SpawnSpec[] = [];
  readonly killCalls: ProcessIdentity[] = [];
  spawnError: unknown = null;
  killError: Error | null = null;
  isAliveError: Error | null = null;
  private nextPid = 1000;
  private readonly exits = new Map<number, (exit: ProcessExit) => void>();

  async spawn(spec: SpawnSpec): Promise<ManagedProcess> {
    this.spawnCalls.push(spec);
    if (this.spawnError) {
      throw this.spawnError;
    }
    const pid = this.nextPid++;
    const identity = { pid, startToken: `token-${pid}` };
    this.alive.set(pid, identity.startToken);
    const exited = new Promise<ProcessExit>(resolve => this.exits.set(pid, resolve));
    return { identity, startedAt: new Date(5_000), exited };
  }

  /** Simulates the process exiting (exit event + gone from the OS). */
  exit(pid: number, exit: ProcessExit = { code: 1, signal: null }): void {
    this.alive.delete(pid);
    this.exits.get(pid)?.(exit);
  }

  async readIdentity(pid: number): Promise<ProcessIdentity | null> {
    const token = this.alive.get(pid);
    return token ? { pid, startToken: token } : null;
  }

  async isAlive(identity: ProcessIdentity): Promise<boolean> {
    if (this.isAliveError) {
      throw this.isAliveError;
    }
    return this.alive.get(identity.pid) === identity.startToken;
  }

  isPidRunning(pid: number): boolean {
    return this.alive.has(pid);
  }

  async killTree(identity: ProcessIdentity): Promise<KillResult> {
    this.killCalls.push(identity);
    if (this.killError) {
      throw this.killError;
    }
    if (this.alive.get(identity.pid) !== identity.startToken) {
      return 'identity_mismatch';
    }
    this.alive.delete(identity.pid);
    return 'killed';
  }
}
