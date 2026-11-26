import { randomBytes } from 'node:crypto';
import {
  closeSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import path from 'node:path';

const KEY_FILE_NAME = '.session.key';
const KEY_PATTERN = /^[0-9a-f]{64}$/;

export class SessionKeyFileError extends Error {
  constructor(file: string) {
    super(
      `The session key file ${file} is unreadable or invalid (expected 64 lowercase hex characters). ` +
        `Fix the file, or delete it (this signs everyone out and a new key is created), ` +
        `or set SESSION_SECRET instead.`,
    );
    this.name = 'SessionKeyFileError';
  }
}

function readKey(file: string): string {
  let content: string;
  try {
    content = readFileSync(file, 'utf8').trim();
  } catch {
    throw new SessionKeyFileError(file);
  }
  if (!KEY_PATTERN.test(content)) {
    throw new SessionKeyFileError(file);
  }
  return content;
}

export function resolveSessionSecret(options: { configured?: string; dir?: string } = {}): string {
  if (options.configured) {
    return options.configured;
  }
  const dir = options.dir ?? path.resolve(process.cwd(), 'manager-data');
  const file = path.join(dir, KEY_FILE_NAME);
  mkdirSync(dir, { recursive: true });
  const key = randomBytes(32).toString('hex');
  const temp = path.join(
    dir,
    `${KEY_FILE_NAME}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`,
  );
  try {
    const fd = openSync(temp, 'wx', 0o600);
    try {
      writeSync(fd, `${key}\n`);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    // linkSync fails with EEXIST when another start already published a key.
    linkSync(temp, file);
    return key;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
    return readKey(file);
  } finally {
    rmTemp(temp);
  }
}

function rmTemp(temp: string): void {
  try {
    unlinkSync(temp);
  } catch {
    // The temp file may never have been created.
  }
}
