import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { createProcessManager } from './create-process-manager';
import { type ProcessIdentity, ProcessSpawnError } from './process-manager.types';

const FIXTURE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'process-tree.mjs',
);
const manager = createProcessManager();
const leftovers: number[] = [];

interface FixturePids {
  parent: number;
  grandchild: number;
}

/**
 * Polls until the fixture has written its PID file. Reads and parses in one step (no separate
 * existence check, so nothing can change between check and use); a missing or partially written
 * file is simply retried.
 */
async function waitForPids(file: string, timeoutMs = 10_000): Promise<FixturePids> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as FixturePids;
    } catch {
      // Not written yet, or caught mid-write: retry.
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${file}`);
}

afterEach(() => {
  for (const pid of leftovers.splice(0)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already gone.
    }
  }
});

// Real OS processes on the current platform (Windows locally, Linux in CI).
describe(`ProcessManager integration (${process.platform})`, () => {
  it('spawns a detached process, verifies its identity and kills the whole tree', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-process-'));
    const pidFile = path.join(tempDir, 'pids.json');

    const managed = await manager.spawn({
      executable: process.execPath,
      args: [FIXTURE, pidFile],
      cwd: tempDir,
    });
    const pids = await waitForPids(pidFile);
    leftovers.push(pids.parent, pids.grandchild);

    expect(managed.identity.pid).toBe(pids.parent);
    expect(managed.identity.startToken).toMatch(/^(win32|linux):/);
    expect(managed.startedAt).toBeInstanceOf(Date);
    expect(await manager.readIdentity(pids.parent)).toEqual(managed.identity);
    expect(await manager.isAlive(managed.identity)).toBe(true);
    expect(manager.isPidRunning(pids.grandchild)).toBe(true);

    const recycled: ProcessIdentity = { pid: pids.parent, startToken: 'linux:0' };
    expect(await manager.killTree(recycled)).toBe('identity_mismatch');
    expect(manager.isPidRunning(pids.parent)).toBe(true);

    expect(await manager.killTree(managed.identity, { graceMs: 2_000 })).toBe('killed');
    expect(manager.isPidRunning(pids.parent)).toBe(false);
    const deadline = Date.now() + 5_000;
    while (manager.isPidRunning(pids.grandchild) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(manager.isPidRunning(pids.grandchild)).toBe(false);
    // Linux reports the terminating signal (code null); Windows taskkill reports an exit code.
    const exit = await managed.exited;
    if (process.platform === 'win32') {
      expect(exit.code).not.toBeNull();
    } else {
      expect(exit).toEqual({ code: null, signal: expect.stringMatching(/^SIG(TERM|KILL)$/) });
    }

    expect(await manager.isAlive(managed.identity)).toBe(false);
    expect(await manager.readIdentity(pids.parent)).toBeNull();
    expect(await manager.killTree(managed.identity)).toBe('not_running');
    fs.rmSync(tempDir, { recursive: true, force: true });
  }, 30_000);

  it('rejects a missing executable with SPAWN_FAILED', async () => {
    const error = await manager
      .spawn({
        executable: path.join(os.tmpdir(), 'dsm-does-not-exist', 'DayZServer'),
        args: [],
        cwd: os.tmpdir(),
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProcessSpawnError);
    expect(error).toMatchObject({ code: 'SPAWN_FAILED', details: { osCode: 'ENOENT' } });
  });

  it('reports a process that exits immediately', async () => {
    const outcome = await manager
      .spawn({ executable: process.execPath, args: ['-e', 'process.exit(3)'], cwd: os.tmpdir() })
      .then(managed => managed.exited)
      .catch((e: unknown) => e);
    // Either the exit beats the identity read (error) or the handle reports it (exit code).
    if (outcome instanceof ProcessSpawnError) {
      expect(outcome).toMatchObject({ code: 'SPAWN_EXITED_EARLY', details: { exit: { code: 3 } } });
    } else {
      expect(outcome).toEqual({ code: 3, signal: null });
    }
  }, 20_000);
});
