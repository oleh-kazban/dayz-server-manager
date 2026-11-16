import { describe, expect, it } from 'vitest';

import { createFakeSystem, osError } from './__fixtures__/fake-process-system';
import { ProcessKillError } from './process-manager.types';
import type { ExecResult } from './process-system';
import { WindowsProcessManager, windowsSystemTools } from './windows-process-manager';

const TOOLS = windowsSystemTools();
const SEP = String.fromCharCode(92);

const CREATED = '2026-11-16T18:53:05.1234560Z';
const ID = { pid: 4242, startToken: `win32:${CREATED}` };
const ok = (stdout = ''): ExecResult => ({ code: 0, stdout, stderr: '' });

function managerWith(options: {
  identity?: string;
  taskkill?: ExecResult;
  stillRunning?: boolean;
}) {
  let killed = false;
  const system = createFakeSystem({
    execFile: command => {
      if (command === TOOLS.taskkill) {
        killed = true;
        return options.taskkill ?? ok('SUCCESS');
      }
      return ok(options.identity ?? `${CREATED}\r\n`);
    },
    kill: () => {
      if (killed && !options.stillRunning) throw osError('ESRCH');
    },
  });
  return { system, manager: new WindowsProcessManager(system) };
}

describe('WindowsProcessManager.readIdentity', () => {
  it('reads the CIM creation date through PowerShell without a shell string', async () => {
    const { system, manager } = managerWith({});
    expect(await manager.readIdentity(4242)).toEqual(ID);
    expect(system.execCalls[0].command).toBe(TOOLS.powershell);
    expect(system.execCalls[0].args.slice(0, 3)).toEqual([
      '-NoProfile',
      '-NonInteractive',
      '-Command',
    ]);
    expect(system.execCalls[0].args[3]).toContain("-Filter 'ProcessId=4242'");
  });

  it('returns null for invalid PIDs (without running PowerShell) and for missing processes', async () => {
    const { system, manager } = managerWith({ identity: '  \r\n' });
    expect(await manager.readIdentity(-1)).toBeNull();
    expect(system.execCalls).toEqual([]);
    expect(await manager.readIdentity(4242)).toBeNull();
  });

  it('throws when PowerShell fails, with stderr or the exit code', async () => {
    const failing = new WindowsProcessManager(
      createFakeSystem({ execFile: () => ({ code: 1, stdout: '', stderr: 'Access denied\r\n' }) }),
    );
    await expect(failing.readIdentity(4242)).rejects.toThrow(
      'Failed to read the identity of process 4242: Access denied',
    );
    const silent = new WindowsProcessManager(
      createFakeSystem({ execFile: () => ({ code: null, stdout: '', stderr: '' }) }),
    );
    await expect(silent.readIdentity(4242)).rejects.toThrow('exit code none');
  });

  it('uses the Node defaults when constructed without a system', () => {
    expect(new WindowsProcessManager()).toBeInstanceOf(WindowsProcessManager);
  });

  it('resolves PowerShell and taskkill to absolute System32 paths, never via PATH', () => {
    expect(windowsSystemTools('D:/Win')).toEqual({
      powershell: ['D:', 'Win', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'].join(
        SEP,
      ),
      taskkill: ['D:', 'Win', 'System32', 'taskkill.exe'].join(SEP),
    });
    const saved = process.env['SystemRoot'];
    delete process.env['SystemRoot'];
    try {
      expect(windowsSystemTools().taskkill).toBe(
        ['C:', 'Windows', 'System32', 'taskkill.exe'].join(SEP),
      );
    } finally {
      if (saved !== undefined) process.env['SystemRoot'] = saved;
    }
  });
});

describe('WindowsProcessManager.killTree', () => {
  it('runs taskkill /T /F for the verified PID and waits until it is gone', async () => {
    const { system, manager } = managerWith({});
    expect(await manager.killTree(ID)).toBe('killed');
    expect(system.execCalls.at(-1)).toEqual({
      command: TOOLS.taskkill,
      args: ['/PID', '4242', '/T', '/F'],
    });
  });

  it('refuses a recycled PID without running taskkill', async () => {
    const { system, manager } = managerWith({ identity: '2020-01-01T00:00:00.0000000Z' });
    expect(await manager.killTree(ID)).toBe('identity_mismatch');
    expect(system.execCalls.map(c => c.command)).toEqual([TOOLS.powershell]);
  });

  it('maps taskkill "not found" to not_running', async () => {
    const { manager } = managerWith({ taskkill: { code: 128, stdout: '', stderr: 'not found' } });
    expect(await manager.killTree(ID)).toBe('not_running');
  });

  it('throws KILL_FAILED with the taskkill output on other failures', async () => {
    const { manager } = managerWith({
      taskkill: { code: 1, stdout: 'ERROR: ', stderr: 'Access is denied.' },
    });
    const error = await manager.killTree(ID).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProcessKillError);
    expect(error).toMatchObject({
      code: 'KILL_FAILED',
      details: { pid: 4242, output: 'ERROR: Access is denied.' },
    });
  });

  it('throws when the process survives taskkill', async () => {
    const { manager } = managerWith({ stillRunning: true });
    await expect(manager.killTree(ID)).rejects.toThrow(
      'Process 4242 is still running after taskkill.',
    );
  });
});
