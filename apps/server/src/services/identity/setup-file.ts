import { randomBytes } from 'node:crypto';
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import path from 'node:path';

export const SETUP_FILE_NAME = 'setup-credentials.txt';

const NOTICE =
  '# Aegis first-time setup. Sign in with these credentials, then create the root account. Anyone who can read this file can sign in until it expires or is deleted.';

export interface SetupCredentials {
  username: string;
  password: string;
}

/** Same default as the session key directory (`config/session-secret.ts`). */
export function defaultDataDir(): string {
  return path.resolve(process.cwd(), 'manager-data');
}

function isErrno(error: unknown, code: string): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === code;
}

/** Writes the file through an exclusive 0600 temp file and an atomic rename; returns its path. */
export function writeSetupFile(dir: string, pair: SetupCredentials, expiresAt: Date): string {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, SETUP_FILE_NAME);
  const temp = path.join(
    dir,
    `${SETUP_FILE_NAME}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`,
  );
  const content = `${NOTICE}\nusername: ${pair.username}\npassword: ${pair.password}\nexpires: ${expiresAt.toISOString()}\n`;

  try {
    const fd = openSync(temp, 'wx', 0o600);
    try {
      writeSync(fd, content);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(temp, file);
  } finally {
    rmSync(temp, { force: true });
  }
  return file;
}

/** Strict parse of the four lines; any read error or deviation returns null (fail closed). */
export function readSetupFile(
  dir: string,
): { username: string; password: string; expires: string } | null {
  let lines: string[];
  try {
    lines = readFileSync(path.join(dir, SETUP_FILE_NAME), 'utf8').split('\n');
  } catch {
    return null;
  }
  if (lines.length !== 5 || lines[4] !== '' || !lines[0].startsWith('#')) return null;

  const value = (line: string, key: string) =>
    line.startsWith(`${key}: `) ? line.slice(key.length + 2) : null;
  const username = value(lines[1], 'username');
  const password = value(lines[2], 'password');
  const expires = value(lines[3], 'expires');
  if (username === null || password === null || expires === null) return null;
  return { username, password, expires };
}

/** Deletes the file; a missing file is fine, any other error is for the caller to report. */
export function removeSetupFile(dir: string): void {
  try {
    unlinkSync(path.join(dir, SETUP_FILE_NAME));
  } catch (error) {
    if (!isErrno(error, 'ENOENT')) throw error;
  }
}
