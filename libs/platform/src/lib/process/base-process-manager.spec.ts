import { describe, expect, it } from 'vitest';

import {
  createFakeSystem,
  FakeChild,
  type FakeSystem,
  osError,
} from './__fixtures__/fake-process-system';
import { BaseProcessManager } from './base-process-manager';
import { type ProcessIdentity, ProcessSpawnError } from './process-manager.types';

class TestManager extends BaseProcessManager {
  identity: ProcessIdentity | null = { pid: 4242, startToken: 't1' };

  async readIdentity(pid: number): Promise<ProcessIdentity | null> {
    return this.identity && { ...this.identity, pid };
  }

  async killTree(): Promise<'killed'> {
    return 'killed';
  }

  verify(identity: ProcessIdentity) {
    return this.verifyBeforeKill(identity);
  }

  wait(isGone: () => boolean, timeoutMs: number) {
    return this.waitUntil(isGone, timeoutMs);
  }
}

const SPEC = { executable: '/srv/dayz/DayZServer', args: ['-port=2302'], cwd: '/srv/dayz' };

function setup(handlers: Parameters<typeof createFakeSystem>[0] = {}) {
  const system: FakeSystem = createFakeSystem(handlers);
  return { system, manager: new TestManager(system) };
}

describe('BaseProcessManager.spawn', () => {
  it('spawns detached with an argument array, no shell, ignored stdio, and unrefs the child', async () => {
    const { system, manager } = setup();
    const pending = manager.spawn(SPEC);
    system.child.emit('spawn');
    const managed = await pending;

    expect(system.spawnCalls).toEqual([
      {
        command: SPEC.executable,
        args: SPEC.args,
        options: {
          cwd: SPEC.cwd,
          env: process.env,
          shell: false,
          windowsHide: true,
          detached: true,
          stdio: 'ignore',
        },
      },
    ]);
    expect(system.child.unref).toHaveBeenCalledTimes(1);
    expect(managed.identity).toEqual({ pid: 4242, startToken: 't1' });
    expect(managed.startedAt).toEqual(new Date(1_000));

    system.child.emit('exit', 0, null);
    await expect(managed.exited).resolves.toEqual({ code: 0, signal: null });
  });

  it('passes a custom environment', async () => {
    const { system, manager } = setup();
    const env = { DAYZ: '1' };
    const pending = manager.spawn({ ...SPEC, env });
    system.child.emit('spawn');
    await pending;
    expect(system.spawnCalls[0].options.env).toBe(env);
  });

  it('maps a synchronous spawn failure to SPAWN_FAILED with the OS code', async () => {
    const { manager } = setup({
      spawn: () => {
        throw osError('EACCES');
      },
    });
    await expect(manager.spawn(SPEC)).rejects.toMatchObject({
      name: 'ProcessSpawnError',
      code: 'SPAWN_FAILED',
      message: "Failed to start '/srv/dayz/DayZServer' (EACCES).",
      details: { osCode: 'EACCES' },
    });
  });

  it('maps an asynchronous spawn error, with or without an OS code', async () => {
    const first = setup();
    const pending = first.manager.spawn(SPEC);
    first.system.child.emit('error', osError('ENOENT'));
    await expect(pending).rejects.toMatchObject({
      code: 'SPAWN_FAILED',
      details: { osCode: 'ENOENT' },
    });

    const second = setup();
    const pendingPlain = second.manager.spawn(SPEC);
    second.system.child.emit('error', new Error('boom'));
    const error = await pendingPlain.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProcessSpawnError);
    expect(error).toMatchObject({
      message: "Failed to start '/srv/dayz/DayZServer'.",
      details: {},
    });
  });

  it('reports SPAWN_EXITED_EARLY when the process is gone before its identity is read', async () => {
    const { system, manager } = setup();
    manager.identity = null;
    const pending = manager.spawn(SPEC);
    system.child.emit('spawn');
    setTimeout(() => system.child.emit('exit', 1, null), 0);
    await expect(pending).rejects.toMatchObject({
      code: 'SPAWN_EXITED_EARLY',
      message: "'/srv/dayz/DayZServer' exited immediately (code 1, signal none).",
      details: { exit: { code: 1, signal: null } },
    });

    const signalled = setup();
    signalled.manager.identity = null;
    const pendingSignal = signalled.manager.spawn(SPEC);
    signalled.system.child.emit('spawn');
    setTimeout(() => signalled.system.child.emit('exit', null, 'SIGKILL'), 0);
    await expect(pendingSignal).rejects.toMatchObject({
      message: "'/srv/dayz/DayZServer' exited immediately (code none, signal SIGKILL).",
    });
  });
});

describe('BaseProcessManager liveness', () => {
  it('isPidRunning treats invalid PIDs, ESRCH and EPERM correctly', () => {
    let error: NodeJS.ErrnoException | null = null;
    const { manager } = setup({
      kill: () => {
        if (error) throw error;
      },
    });
    expect(manager.isPidRunning(0)).toBe(false);
    expect(manager.isPidRunning(-5)).toBe(false);
    expect(manager.isPidRunning(1.5)).toBe(false);
    expect(manager.isPidRunning(10)).toBe(true);
    error = osError('ESRCH');
    expect(manager.isPidRunning(10)).toBe(false);
    error = osError('EPERM');
    expect(manager.isPidRunning(10)).toBe(true);
  });

  it('isAlive requires a running PID with a matching start token', async () => {
    let running = true;
    const { manager } = setup({
      kill: () => {
        if (!running) throw osError('ESRCH');
      },
    });
    expect(await manager.isAlive({ pid: 4242, startToken: 't1' })).toBe(true);
    expect(await manager.isAlive({ pid: 4242, startToken: 'other' })).toBe(false);
    manager.identity = null;
    expect(await manager.isAlive({ pid: 4242, startToken: 't1' })).toBe(false);
    running = false;
    expect(await manager.isAlive({ pid: 4242, startToken: 't1' })).toBe(false);
  });

  it('verifyBeforeKill distinguishes gone, recycled and matching processes', async () => {
    const { manager } = setup();
    expect(await manager.verify({ pid: 4242, startToken: 't1' })).toBeNull();
    expect(await manager.verify({ pid: 4242, startToken: 'old' })).toBe('identity_mismatch');
    manager.identity = null;
    expect(await manager.verify({ pid: 4242, startToken: 't1' })).toBe('not_running');
  });

  it('waitUntil polls on the virtual clock until done or timed out', async () => {
    const { system, manager } = setup();
    let polls = 0;
    expect(await manager.wait(() => ++polls >= 3, 1_000)).toBe(true);
    expect(polls).toBe(3);
    const start = system.clock;
    expect(await manager.wait(() => false, 250)).toBe(false);
    expect(system.clock - start).toBeGreaterThanOrEqual(250);
  });
});

describe('FakeChild', () => {
  it('defaults to a PID', () => {
    expect(new FakeChild().pid).toBe(4242);
  });
});
