import { BaseProcessManager, KILL_CONFIRM_TIMEOUT_MS } from './base-process-manager';
import {
  type KillResult,
  type KillTreeOptions,
  type ProcessIdentity,
  ProcessKillError,
} from './process-manager.types';
import { errnoCode, nodeProcessSystem, type ProcessSystem } from './process-system';

export const DEFAULT_POSIX_GRACE_MS = 10_000;
/** `/proc/<pid>/stat` field 22 (starttime) is the 20th field after the `(comm)` field. */
const STARTTIME_INDEX_AFTER_COMM = 19;

/**
 * Linux adapter: processes run in their own process group (`detached: true`), so the whole tree is
 * signalled through the negative group id. Identity comes from the kernel start time in `/proc`.
 */
export class PosixProcessManager extends BaseProcessManager {
  constructor(system: ProcessSystem = nodeProcessSystem) {
    super(system);
  }

  async readIdentity(pid: number): Promise<ProcessIdentity | null> {
    if (!Number.isInteger(pid) || pid <= 0) {
      return null;
    }
    let stat: string;
    try {
      stat = await this.system.readFile(`/proc/${pid}/stat`);
    } catch {
      return null;
    }
    // The command name may contain spaces and parentheses; fields resume after the last ')'.
    const fields = stat
      .slice(stat.lastIndexOf(')') + 1)
      .trim()
      .split(/\s+/);
    const startTime = fields[STARTTIME_INDEX_AFTER_COMM];
    return startTime && /^\d+$/.test(startTime) ? { pid, startToken: `linux:${startTime}` } : null;
  }

  async killTree(identity: ProcessIdentity, options: KillTreeOptions = {}): Promise<KillResult> {
    const refused = await this.verifyBeforeKill(identity);
    if (refused) {
      return refused;
    }

    const graceMs = options.graceMs ?? DEFAULT_POSIX_GRACE_MS;
    if (!this.signalGroup(identity.pid, 'SIGTERM')) {
      return 'not_running';
    }
    if (await this.waitUntil(() => !this.isGroupRunning(identity.pid), graceMs)) {
      return 'killed';
    }

    this.signalGroup(identity.pid, 'SIGKILL');
    if (await this.waitUntil(() => !this.isGroupRunning(identity.pid), KILL_CONFIRM_TIMEOUT_MS)) {
      return 'killed';
    }
    throw new ProcessKillError(`Process group ${identity.pid} is still running after SIGKILL.`, {
      pid: identity.pid,
    });
  }

  /** Sends a signal to the process group; false when the group no longer exists. */
  private signalGroup(pid: number, signal: NodeJS.Signals): boolean {
    try {
      this.system.kill(-pid, signal);
      return true;
    } catch (error) {
      const osCode = errnoCode(error);
      if (osCode === 'ESRCH') {
        return false;
      }
      throw new ProcessKillError(`Failed to send ${signal} to process group ${pid}.`, {
        pid,
        osCode,
      });
    }
  }

  private isGroupRunning(pid: number): boolean {
    try {
      this.system.kill(-pid, 0);
      return true;
    } catch (error) {
      return errnoCode(error) === 'EPERM';
    }
  }
}
