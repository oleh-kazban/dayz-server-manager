import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

import { resolveSessionSecret, SessionKeyFileError } from './session-secret';

// Only writeSync and linkSync can be replaced; every other fs call stays real.
const failures = vi.hoisted(() => ({
  write: false,
  // Set to the content the "other start" publishes just before this start's link.
  racePublish: undefined as string | undefined,
}));

vi.mock('node:fs', async importActual => {
  const actual = await importActual<typeof import('node:fs')>();
  return {
    ...actual,
    writeSync: (...args: Parameters<typeof actual.writeSync>) => {
      if (failures.write) {
        throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      }
      return actual.writeSync(...args);
    },
    linkSync: (existing: string, target: string) => {
      if (failures.racePublish !== undefined) {
        actual.writeFileSync(target, failures.racePublish);
        throw Object.assign(new Error('file exists'), { code: 'EEXIST' });
      }
      return actual.linkSync(existing, target);
    },
  };
});

describe('resolveSessionSecret with failing filesystem calls', () => {
  let dir: string;
  let keyFile: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'aegis-session-key-'));
    keyFile = path.join(dir, '.session.key');
    failures.write = false;
    failures.racePublish = undefined;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('rethrows a non-EEXIST write error unchanged, leaving no key or temp file', () => {
    failures.write = true;
    let error: unknown;
    try {
      resolveSessionSecret({ dir });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(SessionKeyFileError);
    expect((error as NodeJS.ErrnoException).code).toBe('ENOSPC');
    expect((error as Error).message).toBe('disk full');
    expect(readdirSync(dir)).toEqual([]);
  });

  it('returns the key another start published first, and removes the temp file', () => {
    const winner = 'cd34'.repeat(16);
    failures.racePublish = `${winner}\n`;

    expect(resolveSessionSecret({ dir })).toBe(winner);
    expect(readFileSync(keyFile, 'utf8').trim()).toBe(winner);
    expect(readdirSync(dir)).toEqual(['.session.key']);
  });

  it('throws SessionKeyFileError when the key the other start published is invalid', () => {
    failures.racePublish = '';
    let error: unknown;
    try {
      resolveSessionSecret({ dir });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(SessionKeyFileError);
    expect((error as Error).message).toContain(keyFile);
    expect(readdirSync(dir)).toEqual(['.session.key']);
  });

  it('reads the existing key when the real link fails with EEXIST and leaves no temp file', () => {
    const existing = 'ab12'.repeat(16);
    writeFileSync(keyFile, existing);

    expect(resolveSessionSecret({ dir })).toBe(existing);
    expect(readdirSync(dir)).toEqual(['.session.key']);
  });
});
