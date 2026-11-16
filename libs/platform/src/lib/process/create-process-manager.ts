import { PosixProcessManager } from './posix-process-manager';
import type { ProcessManager } from './process-manager.types';
import { nodeProcessSystem, type ProcessSystem } from './process-system';
import { WindowsProcessManager } from './windows-process-manager';

/** Windows adapter on `win32`; the POSIX process-group adapter everywhere else (Linux). */
export function createProcessManager(
  platform: NodeJS.Platform = process.platform,
  system: ProcessSystem = nodeProcessSystem,
): ProcessManager {
  return platform === 'win32' ? new WindowsProcessManager(system) : new PosixProcessManager(system);
}
