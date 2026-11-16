import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createFakeSystem } from './__fixtures__/fake-process-system';
import { createProcessManager } from './create-process-manager';
import { PosixProcessManager } from './posix-process-manager';
import { errnoCode, execExitCode, nodeProcessSystem } from './process-system';
import { WindowsProcessManager } from './windows-process-manager';

describe('createProcessManager', () => {
  it('picks the adapter by platform', () => {
    expect(createProcessManager('win32', createFakeSystem())).toBeInstanceOf(WindowsProcessManager);
    expect(createProcessManager('linux', createFakeSystem())).toBeInstanceOf(PosixProcessManager);
    expect(createProcessManager('darwin')).toBeInstanceOf(PosixProcessManager);
    expect(createProcessManager()).toBeInstanceOf(
      process.platform === 'win32' ? WindowsProcessManager : PosixProcessManager,
    );
  });
});

describe('process-system helpers', () => {
  it('execExitCode maps success, numeric exit codes and signals', () => {
    expect(execExitCode(null)).toBe(0);
    expect(execExitCode({ code: 128 })).toBe(128);
    expect(execExitCode({ code: 'ENOENT' })).toBeNull();
  });

  it('errnoCode reads the code of OS errors only', () => {
    expect(errnoCode(Object.assign(new Error('x'), { code: 'ESRCH' }))).toBe('ESRCH');
    expect(errnoCode(new Error('x'))).toBeUndefined();
    expect(errnoCode('ESRCH')).toBeUndefined();
    expect(errnoCode(null)).toBeUndefined();
  });
});

describe('nodeProcessSystem', () => {
  it('execFile resolves exit code and output without throwing', async () => {
    const success = await nodeProcessSystem.execFile(
      process.execPath,
      ['-e', 'process.stdout.write("hi")'],
      10_000,
    );
    expect(success).toEqual({ code: 0, stdout: 'hi', stderr: '' });

    const failure = await nodeProcessSystem.execFile(
      process.execPath,
      ['-e', 'process.stderr.write("bad"); process.exit(7)'],
      10_000,
    );
    expect(failure).toMatchObject({ code: 7, stderr: 'bad' });

    const missing = await nodeProcessSystem.execFile(
      path.join(os.tmpdir(), 'dsm-missing-binary'),
      [],
      10_000,
    );
    expect(missing.code).toBeNull();
    expect(missing.stderr).toContain('ENOENT');
  });

  it('wraps kill, readFile, sleep and now', async () => {
    expect(() => nodeProcessSystem.kill(process.pid, 0)).not.toThrow();
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-ps-')), 'x.txt');
    fs.writeFileSync(file, 'content');
    expect(await nodeProcessSystem.readFile(file)).toBe('content');
    const before = nodeProcessSystem.now();
    await nodeProcessSystem.sleep(5);
    expect(nodeProcessSystem.now()).toBeGreaterThanOrEqual(before);
  });
});
