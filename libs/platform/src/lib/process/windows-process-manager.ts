import { BaseProcessManager, KILL_CONFIRM_TIMEOUT_MS } from './base-process-manager';
import { type KillResult, type ProcessIdentity, ProcessKillError } from './process-manager.types';
import { nodeProcessSystem, type ProcessSystem } from './process-system';

const POWERSHELL_TIMEOUT_MS = 15_000;
const TASKKILL_TIMEOUT_MS = 15_000;
/** `taskkill` exit code when no process matches the PID. */
const TASKKILL_NOT_FOUND = 128;

/**
 * Windows adapter. Processes are not bound to a Job Object, so they survive DSM restarts (D1);
 * trees are terminated with `taskkill /T /F`. Identity is the process creation time read through
 * CIM (`wmic` is deprecated and not used).
 */
export class WindowsProcessManager extends BaseProcessManager {
  constructor(system: ProcessSystem = nodeProcessSystem) {
    super(system);
  }

  async readIdentity(pid: number): Promise<ProcessIdentity | null> {
    if (!Number.isInteger(pid) || pid <= 0) {
      return null;
    }
    // `pid` is a validated positive integer, so interpolating it into the filter is safe.
    const script = `$p = Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}'; if ($p) { $p.CreationDate.ToUniversalTime().ToString('o') }`;
    const result = await this.system.execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      POWERSHELL_TIMEOUT_MS,
    );
    if (result.code !== 0) {
      const reason = result.stderr.trim() || `exit code ${result.code ?? 'none'}`;
      throw new Error(`Failed to read the identity of process ${pid}: ${reason}`);
    }
    const created = result.stdout.trim();
    return created ? { pid, startToken: `win32:${created}` } : null;
  }

  /** Force-kills the process and all descendants; DayZ's graceful stop is RCON's job (DSM-00163). */
  async killTree(identity: ProcessIdentity): Promise<KillResult> {
    const refused = await this.verifyBeforeKill(identity);
    if (refused) {
      return refused;
    }

    const result = await this.system.execFile(
      'taskkill',
      ['/PID', String(identity.pid), '/T', '/F'],
      TASKKILL_TIMEOUT_MS,
    );
    if (result.code === TASKKILL_NOT_FOUND) {
      return 'not_running';
    }
    if (result.code !== 0) {
      throw new ProcessKillError(`taskkill failed for process ${identity.pid}.`, {
        pid: identity.pid,
        output: `${result.stdout}${result.stderr}`.trim(),
      });
    }
    if (await this.waitUntil(() => !this.isPidRunning(identity.pid), KILL_CONFIRM_TIMEOUT_MS)) {
      return 'killed';
    }
    throw new ProcessKillError(`Process ${identity.pid} is still running after taskkill.`, {
      pid: identity.pid,
    });
  }
}
