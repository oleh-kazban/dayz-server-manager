import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  backupAndRemoveFile,
  backupFileToStore,
  ConfigStorageError,
  writeFileAtomically,
} from './config-atomic-writer';

describe('config-atomic-writer', () => {
  let tempDir: string;
  let tempReal: string;
  let targetDir: string;
  let backupRootDir: string;
  let savedDsmBackupDir: string | undefined;

  const serverId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';

  beforeEach(() => {
    savedDsmBackupDir = process.env.DSM_BACKUP_DIR;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-atomic-writer-'));
    tempReal = fs.realpathSync(tempDir);
    targetDir = path.join(tempReal, 'server');
    backupRootDir = path.join(tempReal, 'backups');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.mkdirSync(backupRootDir, { recursive: true });
    process.env.DSM_BACKUP_DIR = backupRootDir;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (savedDsmBackupDir !== undefined) {
      process.env.DSM_BACKUP_DIR = savedDsmBackupDir;
    } else {
      delete process.env.DSM_BACKUP_DIR;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('maps ConfigStorageError codes to canonical HTTP status codes', () => {
    expect(new ConfigStorageError('CONFIG_PATH_INVALID', 'bad path').statusCode).toBe(400);
    expect(new ConfigStorageError('CONFIG_RCON_PASSWORD_REQUIRED', 'missing pw').statusCode).toBe(
      409,
    );
    expect(new ConfigStorageError('SERVER_RUNNING_CONFIG_LOCKED', 'running').statusCode).toBe(409);
    expect(new ConfigStorageError('CONFIG_WRITE_FAILED', 'io err').statusCode).toBe(500);
    expect(new ConfigStorageError('CONFIG_BACKUP_FAILED', 'bak err').statusCode).toBe(500);
  });

  it('writes files atomically on first write, skips unchanged rewrites, and creates backup on updates', () => {
    const targetPath = path.join(targetDir, 'serverDZ.cfg');
    const contentV1 = 'hostname = "Server V1";\n';

    const first = writeFileAtomically({
      targetPath,
      content: contentV1,
      serverId,
      fileName: 'serverDZ.cfg',
      backupRootDir,
    });
    expect(first).toEqual({ written: true, backupPath: null });
    expect(fs.readFileSync(targetPath, 'utf8')).toBe(contentV1);
    expect(fs.readdirSync(targetDir)).toEqual(['serverDZ.cfg']);

    // Rewriting identical bytes must short-circuit without creating backups
    const same = writeFileAtomically({
      targetPath,
      content: contentV1,
      serverId,
      fileName: 'serverDZ.cfg',
      backupRootDir,
    });
    expect(same).toEqual({ written: false, backupPath: null });
    expect(fs.existsSync(path.join(backupRootDir, serverId))).toBe(false);

    // Updating bytes captures pre-commit backup with v1 bytes and replaces target
    const contentV2 = 'hostname = "Server V2";\n';
    const updated = writeFileAtomically({
      targetPath,
      content: contentV2,
      serverId,
      fileName: 'serverDZ.cfg',
      backupRootDir,
    });
    expect(updated.written).toBe(true);
    expect(updated.backupPath).toBeTruthy();
    expect(fs.readFileSync(targetPath, 'utf8')).toBe(contentV2);
    expect(fs.readFileSync(updated.backupPath as string, 'utf8')).toBe(contentV1);
    expect(fs.readdirSync(targetDir)).toEqual(['serverDZ.cfg']);
  });

  it('writes Buffer content byte-for-byte (BOM + CRLF)', () => {
    const targetPath = path.join(targetDir, 'serverDZ.cfg');
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('hostname = "Ünïcode";\r\nmaxPlayers = 10;\r\n', 'utf8'),
    ]);

    const result = writeFileAtomically({
      targetPath,
      content: bytes,
      serverId,
      fileName: 'serverDZ.cfg',
      backupRootDir,
    });

    expect(result.written).toBe(true);
    expect(fs.readFileSync(targetPath).equals(bytes)).toBe(true);
  });

  it('maps edit-workflow error codes to their HTTP status and carries params', () => {
    const expected: [ConstructorParameters<typeof ConfigStorageError>[0], number][] = [
      ['CONFIG_EDIT_LOCKED', 409],
      ['CONFIG_LOCK_NOT_HELD', 409],
      ['CONFIG_HASH_MISMATCH', 409],
      ['CONFIG_FILE_EXISTS', 409],
      ['CONFIG_FILE_MISSING', 409],
      ['SERVER_CONFIG_EDIT_IN_PROGRESS', 409],
      ['CONFIG_REVISION_NOT_FOUND', 404],
      ['SERVER_NOT_FOUND', 404],
      ['CONFIG_FILE_TOO_LARGE', 413],
      ['CONFIG_VALIDATION_FAILED', 422],
      ['VAULT_KEY_UNAVAILABLE', 500],
      ['VAULT_ENCRYPTION_FAILED', 500],
    ];
    for (const [code, status] of expected) {
      expect(new ConfigStorageError(code, 'x').statusCode).toBe(status);
    }
    const withParams = new ConfigStorageError('CONFIG_VALIDATION_FAILED', 'bad', {
      errorCount: 2,
    });
    expect(withParams.params).toEqual({ errorCount: 2 });
    expect(new ConfigStorageError('CONFIG_HASH_MISMATCH', 'x').params).toBeUndefined();
  });

  it('handles POSIX chmod branch, DSM_BACKUP_DIR fallback, and partial fs.writeSync chunks', () => {
    const targetPath = path.join(targetDir, 'beserver_x64.cfg');
    const chmodSpy = vi.spyOn(fs, 'chmodSync').mockImplementation(() => undefined);

    const realWriteSync = fs.writeSync.bind(fs);
    let splitOnce = true;
    vi.spyOn(fs, 'writeSync').mockImplementation((fd, buf, offset, length) => {
      if (splitOnce && typeof length === 'number' && length > 4) {
        splitOnce = false;
        return realWriteSync(fd, buf as NodeJS.ArrayBufferView, offset ?? 0, 4);
      }
      return realWriteSync(fd, buf as NodeJS.ArrayBufferView, offset ?? 0, length);
    });

    const res = writeFileAtomically({
      targetPath,
      content: 'RConPassword Secret!1\n',
      serverId,
      fileName: 'beserver_x64.cfg',
      platform: 'linux',
      mode: 0o600,
    });
    expect(res.written).toBe(true);
    expect(chmodSpy).toHaveBeenCalledWith(expect.any(String), 0o600);
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('RConPassword Secret!1\n');

    // Update without explicit backupRootDir exercises process.env.DSM_BACKUP_DIR creation branch
    const freshBackupRoot = path.join(tempReal, 'env-backups', 'nested');
    process.env.DSM_BACKUP_DIR = freshBackupRoot;
    const res2 = writeFileAtomically({
      targetPath,
      content: 'RConPassword Secret!2\n',
      serverId,
      fileName: 'beserver_x64.cfg',
    });
    expect(res2.written).toBe(true);
    expect(res2.backupPath).toContain(fs.realpathSync(freshBackupRoot));
  });

  it('prunes backups beyond 15 snapshots while ignoring non-matching files and directories', () => {
    const targetPath = path.join(targetDir, 'serverDZ.cfg');
    const serverBackupDir = path.join(backupRootDir, serverId);
    fs.mkdirSync(serverBackupDir, { recursive: true });

    // Seed 16 historical snapshots with explicit timestamps (sorted oldest -> newest)
    const baseTimeMs = 1_700_000_000_000;
    for (let i = 0; i < 16; i += 1) {
      const name = `serverDZ.cfg.bak_20261114T120000Z_${String(i).padStart(4, '0')}aaaa`;
      const fullPath = path.join(serverBackupDir, name);
      fs.writeFileSync(fullPath, `snap-${i}`, 'utf8');
      const ts = new Date(baseTimeMs + (i < 2 ? 0 : i * 1000));
      fs.utimesSync(fullPath, ts, ts);
    }

    // Add unrelated file and unrelated subdir in backup store that must never be pruned
    fs.writeFileSync(path.join(serverBackupDir, 'other.txt'), 'keep', 'utf8');
    fs.mkdirSync(path.join(serverBackupDir, 'serverDZ.cfg.bak_subdir'));

    fs.writeFileSync(targetPath, 'current-on-disk', 'utf8');
    const writeRes = writeFileAtomically({
      targetPath,
      content: 'next-version',
      serverId,
      fileName: 'serverDZ.cfg',
      backupRootDir,
    });
    expect(writeRes.written).toBe(true);

    const remainingSnapshots = fs
      .readdirSync(serverBackupDir)
      .filter(name => name.startsWith('serverDZ.cfg.bak_') && !name.endsWith('subdir'));
    expect(remainingSnapshots).toHaveLength(15);
    expect(remainingSnapshots).not.toContain('serverDZ.cfg.bak_20261114T120000Z_0000aaaa');
    expect(remainingSnapshots).not.toContain('serverDZ.cfg.bak_20261114T120000Z_0001aaaa');
    expect(fs.existsSync(path.join(serverBackupDir, 'other.txt'))).toBe(true);
    expect(fs.existsSync(path.join(serverBackupDir, 'serverDZ.cfg.bak_subdir'))).toBe(true);
  });

  it('rejects unsafe fileName, unsafe serverId, directory targets, and symlink targets cleanly', () => {
    const validTarget = path.join(targetDir, 'serverDZ.cfg');
    fs.writeFileSync(validTarget, 'initial', 'utf8');

    expect(() =>
      writeFileAtomically({
        targetPath: validTarget,
        content: 'next',
        serverId,
        fileName: '../evil.cfg',
        backupRootDir,
      }),
    ).toThrowError(ConfigStorageError);

    expect(() =>
      backupFileToStore({
        targetPath: validTarget,
        serverId: '.',
        fileName: 'serverDZ.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_BACKUP_FAILED' }));

    // Directory cannot masquerade as config file
    const dirTarget = path.join(targetDir, 'dir-as-file');
    fs.mkdirSync(dirTarget);
    expect(() =>
      writeFileAtomically({
        targetPath: dirTarget,
        content: 'x',
        serverId,
        fileName: 'serverDZ.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_PATH_INVALID' }));

    // Symlink target rejection (real junction on disk + explicit lstat symbolic link check)
    const linkTarget = path.join(targetDir, 'link-dir');
    fs.symlinkSync(backupRootDir, linkTarget, process.platform === 'win32' ? 'junction' : 'dir');
    expect(() =>
      writeFileAtomically({
        targetPath: linkTarget,
        content: 'x',
        serverId,
        fileName: 'serverDZ.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_PATH_INVALID' }));

    // Missing target in backupFileToStore and backupAndRemoveFile returns null cleanly
    const nonexistent = path.join(targetDir, 'missing.cfg');
    expect(
      backupFileToStore({
        targetPath: nonexistent,
        serverId,
        fileName: 'missing.cfg',
        backupRootDir,
      }),
    ).toBeNull();
    expect(
      backupAndRemoveFile({
        targetPath: nonexistent,
        serverId,
        fileName: 'missing.cfg',
        backupRootDir,
      }),
    ).toBeNull();
  });

  it('rejects compromised backup root or server backup directory before writing snapshots', () => {
    const validTarget = path.join(targetDir, 'serverDZ.cfg');
    fs.writeFileSync(validTarget, 'initial', 'utf8');

    // Backup root path is a regular file
    const fileAsBackupRoot = path.join(tempReal, 'not-a-dir');
    fs.writeFileSync(fileAsBackupRoot, 'file', 'utf8');
    expect(() =>
      backupFileToStore({
        targetPath: validTarget,
        serverId,
        fileName: 'serverDZ.cfg',
        backupRootDir: fileAsBackupRoot,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_BACKUP_FAILED' }));

    // Backup root realpath resolution failure
    const missingRootReal = vi.spyOn(fs, 'realpathSync').mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });
    expect(() =>
      backupFileToStore({
        targetPath: validTarget,
        serverId,
        fileName: 'serverDZ.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_BACKUP_FAILED' }));
    missingRootReal.mockRestore();

    // Server backup subdirectory is a junction symlink pointing outside backup root
    const externalDir = path.join(tempReal, 'outside-store');
    fs.mkdirSync(externalDir);
    const serverBackupSymlink = path.join(backupRootDir, serverId);
    fs.symlinkSync(
      externalDir,
      serverBackupSymlink,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    expect(() =>
      backupFileToStore({
        targetPath: validTarget,
        serverId,
        fileName: 'serverDZ.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_BACKUP_FAILED' }));
    fs.rmSync(serverBackupSymlink, { recursive: true, force: true });

    // Server backup dir resolves outside canonical backupRootReal (containment guard)
    const serverBackupDir = path.join(backupRootDir, serverId);
    fs.mkdirSync(serverBackupDir, { recursive: true });
    vi.spyOn(fs, 'realpathSync').mockImplementation(p => {
      if (String(p) === serverBackupDir) {
        return externalDir;
      }
      return backupRootDir;
    });
    expect(() =>
      backupFileToStore({
        targetPath: validTarget,
        serverId,
        fileName: 'serverDZ.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_BACKUP_FAILED' }));
    vi.restoreAllMocks();

    // Unexpected non-ConfigStorageError while reading target triggers CONFIG_BACKUP_FAILED
    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw 'non-error-throw';
    });
    expect(() =>
      backupFileToStore({
        targetPath: validTarget,
        serverId,
        fileName: 'serverDZ.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_BACKUP_FAILED' }));
  });

  it('handles backupAndRemoveFile success, unlink error, and cleans up temp file on atomic write failure', () => {
    const stalePath = path.join(targetDir, 'BEServer_x64_active_old.cfg');
    fs.writeFileSync(stalePath, 'RConPassword Old', 'utf8');

    vi.spyOn(fs, 'unlinkSync').mockImplementationOnce(() => {
      throw new Error('EBUSY');
    });
    expect(() =>
      backupAndRemoveFile({
        targetPath: stalePath,
        serverId,
        fileName: 'BEServer_x64_active_old.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_WRITE_FAILED' }));

    vi.restoreAllMocks();
    const removedBackup = backupAndRemoveFile({
      targetPath: stalePath,
      serverId,
      fileName: 'BEServer_x64_active_old.cfg',
      backupRootDir,
    });
    expect(removedBackup).toBeTruthy();
    expect(fs.existsSync(stalePath)).toBe(false);
    expect(fs.readFileSync(removedBackup as string, 'utf8')).toBe('RConPassword Old');

    // Rename failure during writeFileAtomically cleans up .tmp.* artifact and wraps CONFIG_WRITE_FAILED
    const targetPath = path.join(targetDir, 'serverDZ.cfg');
    fs.writeFileSync(targetPath, 'original', 'utf8');
    vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
      throw new Error('EXDEV');
    });

    expect(() =>
      writeFileAtomically({
        targetPath,
        content: 'changed',
        serverId,
        fileName: 'serverDZ.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_WRITE_FAILED' }));
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('original');
    expect(fs.readdirSync(targetDir)).toEqual(['serverDZ.cfg']);

    // ConfigStorageError raised during re-verification before rename is rethrown verbatim
    const realLstat = fs.lstatSync.bind(fs);
    let lstatCalls = 0;
    vi.spyOn(fs, 'lstatSync').mockImplementation((p, ...rest) => {
      if (String(p) === targetPath) {
        lstatCalls += 1;
        if (lstatCalls === 3) {
          return {
            isSymbolicLink: () => true,
            isFile: () => false,
            isDirectory: () => false,
          } as unknown as fs.Stats;
        }
      }
      return realLstat(p, ...(rest as []));
    });

    expect(() =>
      writeFileAtomically({
        targetPath,
        content: 'changed-again',
        serverId,
        fileName: 'serverDZ.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ errorCode: 'CONFIG_PATH_INVALID' }));
  });

  it('falls back to <cwd>/manager-data/backups/configs when neither option nor env names a root', () => {
    delete process.env.DSM_BACKUP_DIR;
    vi.spyOn(process, 'cwd').mockReturnValue(tempReal);
    const targetPath = path.join(targetDir, 'serverDZ.cfg');
    fs.writeFileSync(targetPath, 'v1', 'utf8');

    const result = writeFileAtomically({
      targetPath,
      content: 'v2',
      serverId,
      fileName: 'serverDZ.cfg',
    });

    expect(path.dirname(result.backupPath as string)).toBe(
      path.join(tempReal, 'manager-data', 'backups', 'configs', serverId),
    );
    expect(fs.readFileSync(result.backupPath as string, 'utf8')).toBe('v1');
  });

  it('wraps non-Error throws from backup and unlink with generic reasons', () => {
    const targetPath = path.join(targetDir, 'BEServer_x64_active_x.cfg');
    fs.writeFileSync(targetPath, 'stale', 'utf8');

    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw 'raw-read-failure';
    });
    expect(() =>
      backupFileToStore({
        targetPath,
        serverId,
        fileName: 'BEServer_x64_active_x.cfg',
        backupRootDir,
      }),
    ).toThrowError(
      expect.objectContaining({
        errorCode: 'CONFIG_BACKUP_FAILED',
        message: expect.stringContaining('Unknown filesystem backup error'),
      }),
    );

    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw new Error('EIO read');
    });
    expect(() =>
      backupFileToStore({
        targetPath,
        serverId,
        fileName: 'BEServer_x64_active_x.cfg',
        backupRootDir,
      }),
    ).toThrowError(expect.objectContaining({ message: expect.stringContaining('EIO read') }));

    vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
      throw 'raw-rename-failure';
    });
    expect(() =>
      writeFileAtomically({
        targetPath,
        content: 'new',
        serverId,
        fileName: 'x.cfg',
        backupRootDir,
      }),
    ).toThrowError(
      expect.objectContaining({ message: expect.stringContaining('Unknown atomic write error') }),
    );
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('stale');

    vi.spyOn(fs, 'unlinkSync').mockImplementationOnce(() => {
      throw 'raw-unlink-failure';
    });
    expect(() =>
      backupAndRemoveFile({
        targetPath,
        serverId,
        fileName: 'BEServer_x64_active_x.cfg',
        backupRootDir,
      }),
    ).toThrowError(
      expect.objectContaining({
        errorCode: 'CONFIG_WRITE_FAILED',
        message: expect.stringContaining('Unknown unlink failure'),
      }),
    );
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('stale');
  });
});
