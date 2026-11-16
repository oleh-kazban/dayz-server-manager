import { describe, expect, it } from 'vitest';

import { createFakeSystem, type FakeSystem, osError } from './__fixtures__/fake-process-system';
import { DEFAULT_POSIX_GRACE_MS, PosixProcessManager } from './posix-process-manager';
import { ProcessKillError } from './process-manager.types';

// Real layout: pid (comm) state ppid pgrp ... starttime is field 22.
function statLine(comm: string, startTime: string): string {
  const after = [
    'S',
    '1',
    '4242',
    '4242',
    '0',
    '-1',
    '4194560',
    ...Array(12).fill('0'),
    startTime,
    '0',
  ];
  return `4242 (${comm}) ${after.join(' ')}`;
}

const ID = { pid: 4242, startToken: 'linux:987654' };

describe('PosixProcessManager.readIdentity', () => {
  it('reads the start time after the last parenthesis, even for odd command names', async () => {
    const manager = new PosixProcessManager(
      createFakeSystem({ readFile: () => statLine('Day Z) (Server', '987654') }),
    );
    expect(await manager.readIdentity(4242)).toEqual(ID);
  });

  it('returns null for invalid PIDs, missing processes and malformed stat lines', async () => {
    expect(await new PosixProcessManager(createFakeSystem()).readIdentity(0)).toBeNull();
    expect(await new PosixProcessManager(createFakeSystem()).readIdentity(4242)).toBeNull();
    const malformed = new PosixProcessManager(createFakeSystem({ readFile: () => '4242 (x) S 1' }));
    expect(await malformed.readIdentity(4242)).toBeNull();
    const nonNumeric = new PosixProcessManager(
      createFakeSystem({ readFile: () => statLine('x', 'abc') }),
    );
    expect(await nonNumeric.readIdentity(4242)).toBeNull();
  });

  it('uses the Node defaults when constructed without a system', () => {
    expect(new PosixProcessManager()).toBeInstanceOf(PosixProcessManager);
  });
});

describe('PosixProcessManager.killTree', () => {
  /** Group alive until `aliveUntil(system)` is false; records group signals. */
  function managerWith(options: {
    startTime?: string;
    groupAlive: (system: FakeSystem) => boolean;
    termError?: string;
  }) {
    const system = createFakeSystem({
      readFile: () => statLine('DayZServer', options.startTime ?? '987654'),
      kill: (pid, signal, sys) => {
        if (pid > 0) return;
        if (signal === 'SIGTERM' && options.termError) throw osError(options.termError);
        if (signal === 0 && !options.groupAlive(sys)) throw osError('ESRCH');
      },
    });
    return { system, manager: new PosixProcessManager(system) };
  }

  it('refuses a recycled PID and reports a missing process without signalling', async () => {
    const recycled = managerWith({ startTime: '1', groupAlive: () => true });
    expect(await recycled.manager.killTree(ID)).toBe('identity_mismatch');
    expect(recycled.system.killCalls).toEqual([]);

    const gone = new PosixProcessManager(createFakeSystem());
    expect(await gone.killTree(ID)).toBe('not_running');
  });

  it('sends SIGTERM to the process group and stops once the group is gone', async () => {
    const { system, manager } = managerWith({
      groupAlive: sys => sys.killCalls.filter(c => c.signal === 0).length < 3,
    });
    expect(await manager.killTree(ID, { graceMs: 1_000 })).toBe('killed');
    expect(system.killCalls.filter(c => c.signal !== 0)).toEqual([
      { pid: -4242, signal: 'SIGTERM' },
    ]);
  });

  it('escalates to SIGKILL after the grace period (default grace when omitted)', async () => {
    let killed = false;
    const { system, manager } = managerWith({
      groupAlive: sys => {
        killed ||= sys.killCalls.some(c => c.signal === 'SIGKILL');
        return !killed;
      },
    });
    const start = system.clock;
    expect(await manager.killTree(ID)).toBe('killed');
    expect(system.clock - start).toBeGreaterThanOrEqual(DEFAULT_POSIX_GRACE_MS);
    expect(system.killCalls.filter(c => c.signal !== 0)).toEqual([
      { pid: -4242, signal: 'SIGTERM' },
      { pid: -4242, signal: 'SIGKILL' },
    ]);
  });

  it('treats EPERM on the group probe as still running and fails after SIGKILL', async () => {
    const system = createFakeSystem({
      readFile: () => statLine('DayZServer', '987654'),
      kill: (pid, signal) => {
        if (pid < 0 && signal === 0) throw osError('EPERM');
      },
    });
    const error = await new PosixProcessManager(system)
      .killTree(ID, { graceMs: 200 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProcessKillError);
    expect(error).toMatchObject({ code: 'KILL_FAILED', details: { pid: 4242 } });
  });

  it('reports not_running when the group vanished before SIGTERM, and fails on other errors', async () => {
    const vanished = managerWith({ groupAlive: () => false, termError: 'ESRCH' });
    expect(await vanished.manager.killTree(ID)).toBe('not_running');

    const denied = managerWith({ groupAlive: () => true, termError: 'EPERM' });
    await expect(denied.manager.killTree(ID)).rejects.toMatchObject({
      code: 'KILL_FAILED',
      message: 'Failed to send SIGTERM to process group 4242.',
      details: { pid: 4242, osCode: 'EPERM' },
    });
  });
});
