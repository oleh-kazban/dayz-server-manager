import { type ChildProcess, execFile, spawn, type SpawnOptions } from 'node:child_process';
import { readFile } from 'node:fs/promises';

export interface ExecResult {
  /** Process exit code; `null` when it was terminated by a signal. */
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * OS primitives used by the process managers. Injected so every adapter branch can be unit-tested
 * on any operating system; `nodeProcessSystem` is the real implementation.
 */
export interface ProcessSystem {
  spawn(command: string, args: readonly string[], options: SpawnOptions): ChildProcess;
  /** Runs a command with an argument array (no shell) and resolves with its exit code and output. */
  execFile(command: string, args: readonly string[], timeoutMs: number): Promise<ExecResult>;
  /** `process.kill`; throws with `code` `ESRCH` / `EPERM` like Node does. */
  kill(pid: number, signal: NodeJS.Signals | 0): void;
  readFile(path: string): Promise<string>;
  sleep(ms: number): Promise<void>;
  now(): number;
}

export const nodeProcessSystem: ProcessSystem = {
  spawn: (command, args, options) => spawn(command, [...args], options),
  execFile: (command, args, timeoutMs) =>
    new Promise(resolve => {
      execFile(
        command,
        [...args],
        { timeout: timeoutMs, windowsHide: true, encoding: 'utf8' },
        (error, stdout, stderr) => {
          resolve({ code: execExitCode(error), stdout, stderr: stderr || error?.message || '' });
        },
      );
    }),
  kill: (pid, signal) => {
    process.kill(pid, signal);
  },
  readFile: path => readFile(path, 'utf8'),
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

/** `0` on success, the numeric exit code on failure, `null` when killed or not started. */
export function execExitCode(error: { code?: unknown } | null): number | null {
  if (error === null) {
    return 0;
  }
  return typeof error.code === 'number' ? error.code : null;
}

export function errnoCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}
