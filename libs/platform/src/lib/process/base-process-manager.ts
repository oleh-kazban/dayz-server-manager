import type { ChildProcess } from 'node:child_process';

import {
  type KillResult,
  type KillTreeOptions,
  type ManagedProcess,
  type ProcessExit,
  type ProcessIdentity,
  type ProcessManager,
  ProcessSpawnError,
  type SpawnSpec,
} from './process-manager.types';
import { errnoCode, type ProcessSystem } from './process-system';

/** How long to wait for a killed process tree to disappear before reporting failure. */
export const KILL_CONFIRM_TIMEOUT_MS = 5_000;
export const POLL_INTERVAL_MS = 100;

function waitForSpawn(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once('spawn', () => resolve());
    child.once('error', reject);
  });
}

export abstract class BaseProcessManager implements ProcessManager {
  constructor(protected readonly system: ProcessSystem) {}

  abstract readIdentity(pid: number): Promise<ProcessIdentity | null>;
  abstract killTree(identity: ProcessIdentity, options?: KillTreeOptions): Promise<KillResult>;

  async spawn(spec: SpawnSpec): Promise<ManagedProcess> {
    let child: ChildProcess;
    try {
      child = this.system.spawn(spec.executable, spec.args, {
        cwd: spec.cwd,
        env: spec.env ?? process.env,
        shell: false,
        windowsHide: true,
        // Survive DSM restarts and crashes: own process group (Linux), no inherited pipes.
        detached: true,
        stdio: 'ignore',
      });
    } catch (error) {
      throw this.spawnFailed(spec, error);
    }

    const exited = new Promise<ProcessExit>(resolve => {
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });

    try {
      await waitForSpawn(child);
    } catch (error) {
      throw this.spawnFailed(spec, error);
    }

    // Do not keep DSM's event loop alive for the game server.
    child.unref();
    const startedAt = new Date(this.system.now());
    const pid = child.pid as number;

    const identity = await this.readIdentity(pid);
    if (!identity) {
      const exit = await exited;
      throw new ProcessSpawnError(
        'SPAWN_EXITED_EARLY',
        `'${spec.executable}' exited immediately (code ${exit.code ?? 'none'}, signal ${exit.signal ?? 'none'}).`,
        { exit },
      );
    }

    return { identity, startedAt, exited };
  }

  isPidRunning(pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) {
      return false;
    }
    try {
      this.system.kill(pid, 0);
      return true;
    } catch (error) {
      // EPERM: the process exists but belongs to another user.
      return errnoCode(error) === 'EPERM';
    }
  }

  async isAlive(identity: ProcessIdentity): Promise<boolean> {
    if (!this.isPidRunning(identity.pid)) {
      return false;
    }
    const current = await this.readIdentity(identity.pid);
    return current?.startToken === identity.startToken;
  }

  /** Polls `isGone` until true or `timeoutMs` elapses; resolves whether it became true. */
  protected async waitUntil(isGone: () => boolean, timeoutMs: number): Promise<boolean> {
    const deadline = this.system.now() + timeoutMs;
    while (!isGone()) {
      if (this.system.now() >= deadline) {
        return false;
      }
      await this.system.sleep(POLL_INTERVAL_MS);
    }
    return true;
  }

  /** Re-reads the identity right before a kill: never signal a recycled PID. */
  protected async verifyBeforeKill(
    identity: ProcessIdentity,
  ): Promise<Extract<KillResult, 'not_running' | 'identity_mismatch'> | null> {
    const current = await this.readIdentity(identity.pid);
    if (!current) {
      return 'not_running';
    }
    return current.startToken === identity.startToken ? null : 'identity_mismatch';
  }

  private spawnFailed(spec: SpawnSpec, error: unknown): ProcessSpawnError {
    const osCode = errnoCode(error);
    const reason = osCode ? ` (${osCode})` : '';
    return new ProcessSpawnError(
      'SPAWN_FAILED',
      `Failed to start '${spec.executable}'${reason}.`,
      osCode ? { osCode } : {},
    );
  }
}
