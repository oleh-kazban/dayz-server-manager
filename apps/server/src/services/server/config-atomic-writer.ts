import crypto from 'node:crypto';
import fs from 'node:fs';

import type { ApiErrorParams } from '@aegis/api-contracts';

import {
  getPlatformPathImpl,
  isPathContainedWithin,
  safeLstat,
  safeRealpath,
  safeStat,
} from './server-path-safety';

const MAX_BACKUPS_PER_FILE = 15;
const SAFE_IDENTIFIER_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

let backupSequence = 0;

export type ConfigStorageErrorCode =
  | 'CONFIG_PATH_INVALID'
  | 'CONFIG_WRITE_FAILED'
  | 'CONFIG_BACKUP_FAILED'
  | 'CONFIG_RCON_PASSWORD_REQUIRED'
  | 'SERVER_RUNNING_CONFIG_LOCKED'
  | 'CONFIG_EDIT_LOCKED'
  | 'CONFIG_LOCK_NOT_HELD'
  | 'CONFIG_HASH_MISMATCH'
  | 'CONFIG_VALIDATION_FAILED'
  | 'CONFIG_FILE_TOO_LARGE'
  | 'CONFIG_FILE_EXISTS'
  | 'CONFIG_FILE_MISSING'
  | 'CONFIG_REVISION_NOT_FOUND'
  | 'SERVER_CONFIG_EDIT_IN_PROGRESS'
  | 'VAULT_KEY_UNAVAILABLE'
  | 'VAULT_ENCRYPTION_FAILED'
  | 'SERVER_NOT_FOUND';

const STATUS_CODES: Partial<Record<ConfigStorageErrorCode, number>> = {
  CONFIG_PATH_INVALID: 400,
  CONFIG_RCON_PASSWORD_REQUIRED: 409,
  SERVER_RUNNING_CONFIG_LOCKED: 409,
  CONFIG_EDIT_LOCKED: 409,
  CONFIG_LOCK_NOT_HELD: 409,
  CONFIG_HASH_MISMATCH: 409,
  CONFIG_FILE_EXISTS: 409,
  CONFIG_FILE_MISSING: 409,
  SERVER_CONFIG_EDIT_IN_PROGRESS: 409,
  CONFIG_REVISION_NOT_FOUND: 404,
  SERVER_NOT_FOUND: 404,
  CONFIG_FILE_TOO_LARGE: 413,
  CONFIG_VALIDATION_FAILED: 422,
};

export class ConfigStorageError extends Error {
  readonly errorCode: ConfigStorageErrorCode;
  readonly statusCode: number;
  readonly params: ApiErrorParams | undefined;

  constructor(errorCode: ConfigStorageErrorCode, message: string, params?: ApiErrorParams) {
    super(message);
    this.name = 'ConfigStorageError';
    this.errorCode = errorCode;
    this.statusCode = STATUS_CODES[errorCode] ?? 500;
    this.params = params;
  }
}

export interface BackupFileOptions {
  targetPath: string;
  serverId: string;
  fileName: string;
  backupRootDir?: string;
  platform?: NodeJS.Platform;
}

export interface AtomicWriteOptions {
  targetPath: string;
  content: string | Buffer;
  serverId: string;
  fileName: string;
  backupRootDir?: string;
  platform?: NodeJS.Platform;
  mode?: number;
}

export interface AtomicWriteResult {
  written: boolean;
  backupPath: string | null;
}

function assertSafeIdentifier(
  value: string,
  label: string,
  errorCode: ConfigStorageErrorCode,
): void {
  if (!SAFE_IDENTIFIER_REGEX.test(value) || value === '.' || value.includes('..')) {
    throw new ConfigStorageError(errorCode, `${label} contains unsafe path characters.`);
  }
}

function resolveBackupRoot(backupRootDir: string | undefined, platform: NodeJS.Platform): string {
  const pathImpl = getPlatformPathImpl(platform);
  const configuredRoot =
    backupRootDir ??
    process.env.DSM_BACKUP_DIR ??
    pathImpl.resolve(process.cwd(), 'manager-data', 'backups', 'configs');

  const rootStat = safeStat(configuredRoot);
  if (!rootStat.exists) {
    fs.mkdirSync(configuredRoot, { recursive: true });
  } else if (!rootStat.stat.isDirectory()) {
    throw new ConfigStorageError('CONFIG_BACKUP_FAILED', 'Backup root path is not a directory.');
  }

  const rootReal = safeRealpath(configuredRoot);
  if (!rootReal) {
    throw new ConfigStorageError('CONFIG_BACKUP_FAILED', 'Unable to resolve backup root path.');
  }
  return rootReal;
}

function ensureServerBackupDir(
  serverId: string,
  backupRootDir: string | undefined,
  platform: NodeJS.Platform,
): string {
  assertSafeIdentifier(serverId, 'Server identifier', 'CONFIG_BACKUP_FAILED');
  const pathImpl = getPlatformPathImpl(platform);
  const backupRootReal = resolveBackupRoot(backupRootDir, platform);
  const serverDirCandidate = pathImpl.join(backupRootReal, serverId);

  const serverDirLstat = safeLstat(serverDirCandidate);
  if (serverDirLstat.exists) {
    if (serverDirLstat.stat.isSymbolicLink() || !serverDirLstat.stat.isDirectory()) {
      throw new ConfigStorageError(
        'CONFIG_BACKUP_FAILED',
        'Server backup directory must be a non-symlink directory.',
      );
    }
  } else {
    fs.mkdirSync(serverDirCandidate);
  }

  const serverDirReal = safeRealpath(serverDirCandidate);
  if (!serverDirReal || !isPathContainedWithin(serverDirReal, backupRootReal, platform, false)) {
    throw new ConfigStorageError(
      'CONFIG_BACKUP_FAILED',
      'Server backup directory escaped canonical backup root.',
    );
  }

  return serverDirReal;
}

function writeAllBytes(fd: number, data: Buffer): void {
  let offset = 0;
  while (offset < data.length) {
    offset += fs.writeSync(fd, data, offset, data.length - offset);
  }
}

function writeExclusiveFile(
  filePath: string,
  data: Buffer,
  mode: number,
  platform: NodeJS.Platform,
): void {
  const fd = fs.openSync(
    filePath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
    mode,
  );
  try {
    writeAllBytes(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (platform !== 'win32') {
    fs.chmodSync(filePath, mode);
  }
}

function pruneExcessBackups(
  serverBackupDir: string,
  fileName: string,
  platform: NodeJS.Platform,
): void {
  const pathImpl = getPlatformPathImpl(platform);
  const prefix = `${fileName}.bak_`;
  const entries = fs.readdirSync(serverBackupDir, { withFileTypes: true });
  const snapshots: { name: string; fullPath: string; mtimeMs: number }[] = [];

  for (const entry of entries) {
    if (!entry.name.startsWith(prefix) || entry.isSymbolicLink() || !entry.isFile()) {
      continue;
    }
    const fullPath = pathImpl.join(serverBackupDir, entry.name);
    const stat = fs.statSync(fullPath);
    snapshots.push({ name: entry.name, fullPath, mtimeMs: stat.mtimeMs });
  }

  if (snapshots.length <= MAX_BACKUPS_PER_FILE) {
    return;
  }

  snapshots.sort((a, b) => a.mtimeMs - b.mtimeMs || a.name.localeCompare(b.name));
  const excessCount = snapshots.length - MAX_BACKUPS_PER_FILE;
  for (let i = 0; i < excessCount; i += 1) {
    fs.unlinkSync(snapshots[i].fullPath);
  }
}

function createBackupTimestampTag(): string {
  const compactIso = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
  backupSequence = (backupSequence + 1) & 0xffff;
  const seqHex = backupSequence.toString(16).padStart(4, '0');
  const randHex = crypto.randomBytes(2).toString('hex');
  return `${compactIso}_${seqHex}${randHex}`;
}

/** Returns false when the file is absent; throws when it exists but is not a regular file. */
function assertMutableRegularFile(targetPath: string): boolean {
  const lstat = safeLstat(targetPath);
  if (!lstat.exists) {
    return false;
  }
  if (lstat.stat.isSymbolicLink() || !lstat.stat.isFile()) {
    throw new ConfigStorageError(
      'CONFIG_PATH_INVALID',
      'Configuration target must be a regular non-symlink file.',
    );
  }
  return true;
}

function cleanupUnlinkQuietly(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Best-effort cleanup when aborting atomic write
  }
}

export function backupFileToStore(options: BackupFileOptions): string | null {
  const platform = options.platform ?? process.platform;
  assertSafeIdentifier(options.fileName, 'Configuration filename', 'CONFIG_PATH_INVALID');

  if (!assertMutableRegularFile(options.targetPath)) {
    return null;
  }

  try {
    const contentBuffer = fs.readFileSync(options.targetPath);
    const serverBackupDir = ensureServerBackupDir(
      options.serverId,
      options.backupRootDir,
      platform,
    );
    const pathImpl = getPlatformPathImpl(platform);
    const backupFileName = `${options.fileName}.bak_${createBackupTimestampTag()}`;
    const backupPath = pathImpl.join(serverBackupDir, backupFileName);

    writeExclusiveFile(backupPath, contentBuffer, 0o600, platform);
    pruneExcessBackups(serverBackupDir, options.fileName, platform);
    return backupPath;
  } catch (err) {
    if (err instanceof ConfigStorageError) {
      throw err;
    }
    const reason = err instanceof Error ? err.message : 'Unknown filesystem backup error';
    throw new ConfigStorageError(
      'CONFIG_BACKUP_FAILED',
      `Failed to capture pre-commit configuration backup for '${options.fileName}': ${reason}`,
    );
  }
}

export function backupAndRemoveFile(options: BackupFileOptions): string | null {
  const backupPath = backupFileToStore(options);
  if (backupPath === null) {
    return null;
  }
  try {
    fs.unlinkSync(options.targetPath);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown unlink failure';
    throw new ConfigStorageError(
      'CONFIG_WRITE_FAILED',
      `Failed to remove stale file '${options.fileName}': ${reason}`,
    );
  }
  return backupPath;
}

export function writeFileAtomically(options: AtomicWriteOptions): AtomicWriteResult {
  const platform = options.platform ?? process.platform;
  assertSafeIdentifier(options.fileName, 'Configuration filename', 'CONFIG_PATH_INVALID');

  const exists = assertMutableRegularFile(options.targetPath);
  const nextBuffer =
    typeof options.content === 'string' ? Buffer.from(options.content, 'utf8') : options.content;

  if (exists) {
    const existingBuffer = fs.readFileSync(options.targetPath);
    if (Buffer.compare(existingBuffer, nextBuffer) === 0) {
      return { written: false, backupPath: null };
    }
  }

  const backupPath = exists
    ? backupFileToStore({
        targetPath: options.targetPath,
        serverId: options.serverId,
        fileName: options.fileName,
        backupRootDir: options.backupRootDir,
        platform,
      })
    : null;

  const tempPath = `${options.targetPath}.tmp.${process.pid}.${crypto.randomUUID()}`;
  const targetMode = options.mode ?? 0o644;

  try {
    writeExclusiveFile(tempPath, nextBuffer, targetMode, platform);
    assertMutableRegularFile(options.targetPath);
    fs.renameSync(tempPath, options.targetPath);
    return { written: true, backupPath };
  } catch (err) {
    cleanupUnlinkQuietly(tempPath);
    if (err instanceof ConfigStorageError) {
      throw err;
    }
    const reason = err instanceof Error ? err.message : 'Unknown atomic write error';
    throw new ConfigStorageError(
      'CONFIG_WRITE_FAILED',
      `Failed to write configuration file '${options.fileName}': ${reason}`,
    );
  }
}
