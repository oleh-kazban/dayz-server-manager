import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

import type { ExecResult, ProcessSystem } from '../process-system';

export class FakeChild extends EventEmitter {
  unref = vi.fn();

  constructor(public pid: number | undefined = 4242) {
    super();
  }
}

export function osError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

export interface FakeSystem extends ProcessSystem {
  clock: number;
  child: FakeChild;
  spawnCalls: { command: string; args: readonly string[]; options: SpawnOptions }[];
  execCalls: { command: string; args: readonly string[] }[];
  killCalls: { pid: number; signal: NodeJS.Signals | 0 }[];
}

/**
 * Deterministic `ProcessSystem`: `sleep` advances a virtual clock, spawn returns a controllable
 * child, and `kill` / `execFile` / `readFile` delegate to per-test handlers.
 */
export function createFakeSystem(
  handlers: {
    kill?: (pid: number, signal: NodeJS.Signals | 0, system: FakeSystem) => void;
    execFile?: (command: string, args: readonly string[]) => ExecResult;
    readFile?: (path: string) => string;
    spawn?: () => FakeChild;
  } = {},
): FakeSystem {
  const system: FakeSystem = {
    clock: 1_000,
    child: new FakeChild(),
    spawnCalls: [],
    execCalls: [],
    killCalls: [],
    spawn(command, args, options) {
      system.spawnCalls.push({ command, args, options });
      if (handlers.spawn) {
        system.child = handlers.spawn();
      }
      return system.child as unknown as ChildProcess;
    },
    async execFile(command, args) {
      system.execCalls.push({ command, args });
      return handlers.execFile
        ? handlers.execFile(command, args)
        : { code: 0, stdout: '', stderr: '' };
    },
    kill(pid, signal) {
      system.killCalls.push({ pid, signal });
      handlers.kill?.(pid, signal, system);
    },
    async readFile(path) {
      if (!handlers.readFile) {
        throw osError('ENOENT');
      }
      return handlers.readFile(path);
    },
    async sleep(ms) {
      system.clock += ms;
    },
    now: () => system.clock,
  };
  return system;
}
