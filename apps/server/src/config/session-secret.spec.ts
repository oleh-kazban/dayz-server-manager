import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { resolveSessionSecret, SessionKeyFileError } from './session-secret';

describe('resolveSessionSecret', () => {
  let dir: string;
  let keyFile: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'aegis-session-key-'));
    keyFile = path.join(dir, '.session.key');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('without a configured secret', () => {
    it('creates .session.key with 64 lowercase hex characters on the first call', () => {
      const secret = resolveSessionSecret({ dir });

      expect(secret).toMatch(/^[0-9a-f]{64}$/);
      expect(readFileSync(keyFile, 'utf8').trim()).toBe(secret);
    });

    it('leaves only .session.key in the dir (no temp file)', () => {
      resolveSessionSecret({ dir });

      expect(readdirSync(dir)).toEqual(['.session.key']);
    });

    it('returns the same value on every later call', () => {
      const first = resolveSessionSecret({ dir });

      expect(resolveSessionSecret({ dir })).toBe(first);
      expect(resolveSessionSecret({ dir })).toBe(first);
    });

    it('creates a missing directory recursively', () => {
      const nested = path.join(dir, 'a', 'b');

      const secret = resolveSessionSecret({ dir: nested });

      expect(readFileSync(path.join(nested, '.session.key'), 'utf8').trim()).toBe(secret);
    });

    it('generates different keys for different dirs', () => {
      const other = mkdtempSync(path.join(tmpdir(), 'aegis-session-key-'));
      try {
        expect(resolveSessionSecret({ dir })).not.toBe(resolveSessionSecret({ dir: other }));
      } finally {
        rmSync(other, { recursive: true, force: true });
      }
    });

    it.skipIf(process.platform === 'win32')('writes the key file with owner-only mode', () => {
      resolveSessionSecret({ dir });

      expect(statSync(keyFile).mode & 0o777).toBe(0o600);
    });

    it('uses an existing valid key, ignoring surrounding whitespace', () => {
      const existing = 'ab12'.repeat(16);
      writeFileSync(keyFile, `\n  ${existing}  \n`);

      expect(resolveSessionSecret({ dir })).toBe(existing);
    });
  });

  describe('with a configured secret', () => {
    it('returns it unchanged and creates no key file', () => {
      const configured = 'configured-secret-of-at-least-32-characters';

      expect(resolveSessionSecret({ configured, dir })).toBe(configured);
      expect(() => statSync(keyFile)).toThrow();
    });

    it('does not read an invalid existing key file', () => {
      writeFileSync(keyFile, 'garbage');
      const configured = 'configured-secret-of-at-least-32-characters';

      expect(resolveSessionSecret({ configured, dir })).toBe(configured);
      expect(readFileSync(keyFile, 'utf8')).toBe('garbage');
    });
  });

  describe('with a broken key file', () => {
    const secretLookingContent = 'zz-secret-content-that-is-not-hex';

    function expectActionableError(act: () => unknown, content?: string) {
      let error: unknown;
      try {
        act();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(SessionKeyFileError);
      const message = (error as Error).message;
      expect(message).toContain(keyFile);
      expect(message).toContain('SESSION_SECRET');
      expect(message).toMatch(/delete/i);
      if (content) {
        expect(message).not.toContain(content);
      }
    }

    it.each([
      ['empty', ''],
      ['whitespace only', '  \n'],
      ['too short', 'abcdef0123'],
      ['too long', 'a'.repeat(66)],
      ['not hex', 'g'.repeat(64)],
      ['not hex and secret-looking', secretLookingContent],
    ])('throws for a %s file, names the path and leaves it untouched', (_name, content) => {
      writeFileSync(keyFile, content);

      expectActionableError(() => resolveSessionSecret({ dir }), content.trim() || undefined);

      expect(readFileSync(keyFile, 'utf8')).toBe(content);
    });

    it('does not leak the content of a 64-character non-hex file', () => {
      const content = 'g'.repeat(64);
      writeFileSync(keyFile, content);

      expectActionableError(() => resolveSessionSecret({ dir }), content);
    });

    it('throws when a directory is in place of the key file and leaves it', () => {
      mkdirSync(keyFile);

      expectActionableError(() => resolveSessionSecret({ dir }));

      expect(statSync(keyFile).isDirectory()).toBe(true);
    });
  });
});
