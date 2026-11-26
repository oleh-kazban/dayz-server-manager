import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  defaultDataDir,
  readSetupFile,
  removeSetupFile,
  SETUP_FILE_NAME,
  writeSetupFile,
} from './setup-file';

const NOTICE =
  '# Aegis first-time setup. Sign in with these credentials, then create the root account. Anyone who can read this file can sign in until it expires or is deleted.';
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- test fixture value
const PAIR = { username: 'setup-1a2b3c4d5e6f', password: 'Zk3-pQ9_vL2xW8nB5mT7rY1uC4hJ6dA0' };
const EXPIRES = new Date('2026-11-25T23:36:00.000Z');

describe('setup credentials file', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'aegis-setup-file-'));
    file = path.join(dir, SETUP_FILE_NAME);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('is named setup-credentials.txt and defaults to manager-data under the cwd', () => {
    expect(SETUP_FILE_NAME).toBe('setup-credentials.txt');
    expect(defaultDataDir()).toBe(path.resolve(process.cwd(), 'manager-data'));
  });

  describe('writeSetupFile', () => {
    it('writes exactly the four lines with a trailing newline and returns the path', () => {
      const result = writeSetupFile(dir, PAIR, EXPIRES);

      expect(result).toBe(file);
      expect(readFileSync(file, 'utf8')).toBe(
        `${NOTICE}\nusername: ${PAIR.username}\npassword: ${PAIR.password}\nexpires: 2026-11-25T23:36:00.000Z\n`,
      );
    });

    it('creates a missing directory recursively', () => {
      const nested = path.join(dir, 'a', 'b');

      writeSetupFile(nested, PAIR, EXPIRES);

      expect(existsSync(path.join(nested, SETUP_FILE_NAME))).toBe(true);
    });

    it('leaves only the file in the directory (no temp file)', () => {
      writeSetupFile(dir, PAIR, EXPIRES);

      expect(readdirSync(dir)).toEqual([SETUP_FILE_NAME]);
    });

    it.skipIf(process.platform === 'win32')('creates the file with mode 0600', () => {
      writeSetupFile(dir, PAIR, EXPIRES);

      expect(statSync(file).mode & 0o777).toBe(0o600);
    });

    it('replaces an existing file with the new content', () => {
      writeFileSync(file, 'old content that must disappear\n');
      const other = {
        username: 'setup-ffffffffffff',
        password: 'N3w-pass_word-0123456789abcdefghij',
      };

      writeSetupFile(dir, other, EXPIRES);

      const content = readFileSync(file, 'utf8');
      expect(content).toContain(`username: ${other.username}`);
      expect(content).not.toContain('old content');
      expect(readdirSync(dir)).toEqual([SETUP_FILE_NAME]);
    });

    it('removes its temp file and keeps the password out of the error when publishing fails', () => {
      mkdirSync(path.join(file, 'blocker'), { recursive: true });

      let message = '';
      try {
        writeSetupFile(dir, PAIR, EXPIRES);
      } catch (error) {
        message = String(error);
      }

      expect(message).not.toBe('');
      expect(message).not.toContain(PAIR.password);
      expect(readdirSync(dir)).toEqual([SETUP_FILE_NAME]);
    });

    it('throws for an empty directory planted at the target, leaves no temp file and no password in the error', () => {
      mkdirSync(file);

      let message = '';
      try {
        writeSetupFile(dir, PAIR, EXPIRES);
      } catch (error) {
        message = String(error);
      }

      expect(message).not.toBe('');
      expect(message).not.toContain(PAIR.password);
      expect(readdirSync(dir)).toEqual([SETUP_FILE_NAME]);
    });

    it('replaces a symlink planted at the target by rename and leaves the link target unchanged', context => {
      const victim = path.join(dir, 'victim.txt');
      writeFileSync(victim, 'victim content\n');
      try {
        symlinkSync(victim, file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EPERM') {
          context.skip('creating symlinks needs privileges on this host');
        }
        throw error;
      }

      writeSetupFile(dir, PAIR, EXPIRES);

      expect(readFileSync(victim, 'utf8')).toBe('victim content\n');
      expect(lstatSync(file).isSymbolicLink()).toBe(false);
      expect(readFileSync(file, 'utf8')).toContain(`username: ${PAIR.username}`);
      expect(readdirSync(dir).sort()).toEqual([SETUP_FILE_NAME, 'victim.txt']);
    });

    it('keeps the password out of the error when the directory cannot be created', () => {
      const blocker = path.join(dir, 'not-a-dir');
      writeFileSync(blocker, 'x');

      let message = '';
      try {
        writeSetupFile(path.join(blocker, 'sub'), PAIR, EXPIRES);
      } catch (error) {
        message = String(error);
      }

      expect(message).not.toBe('');
      expect(message).not.toContain(PAIR.password);
    });
  });

  describe('writeSetupFile permission restriction (injected runner)', () => {
    type Run = (
      command: string,
      args: readonly string[],
    ) => { status: number | null; stdout: string; error?: Error };

    const WHOAMI_OUT = '"CORP\\operator","S-1-5-21-111-222-333-1001"\n';
    const OTHER = {
      username: 'setup-ffffffffffff',
      password: 'N3w-pass_word-0123456789abcdefghij',
    };

    /** A fake runner: records calls, answers whoami, and answers icacls through `icacls`. */
    function fakeRun(
      icacls: Run = () => ({ status: 0, stdout: '' }),
      whoami: Run = () => ({ status: 0, stdout: WHOAMI_OUT }),
    ) {
      const calls: { command: string; args: readonly string[] }[] = [];
      const run: Run = (command, args) => {
        calls.push({ command, args });
        return command === 'whoami' ? whoami(command, args) : icacls(command, args);
      };
      return { run, calls };
    }

    function failureOf(run: Run): { message: string } {
      try {
        writeSetupFile(dir, PAIR, EXPIRES, { platform: 'win32', run });
      } catch (error) {
        return { message: error instanceof Error ? error.message : String(error) };
      }
      return { message: '' };
    }

    function expectCleanFailure(message: string) {
      expect(message).toContain(file);
      expect(message).toMatch(/permissions/i);
      expect(message).toMatch(/restrict/i);
      expect(message).toMatch(/NTFS/);
      expect(message).not.toContain(PAIR.password);
      expect(message).not.toContain(PAIR.username);
    }

    function expectNoPairInArgs(calls: { args: readonly string[] }[]) {
      for (const call of calls) {
        for (const arg of call.args) {
          expect(arg).not.toContain(PAIR.password);
          expect(arg).not.toContain(PAIR.username);
        }
      }
    }

    it('on win32 restricts the empty temp file before the pair is written, then renames', () => {
      let seen: { path: string; existed: boolean; size: number } | null = null;
      const { run, calls } = fakeRun(((_command: string, args: readonly string[]) => {
        const temp = args[0];
        const existed = existsSync(temp);
        seen = { path: temp, existed, size: existed ? statSync(temp).size : -1 };
        return { status: 0, stdout: '' };
      }) as Run);

      const result = writeSetupFile(dir, PAIR, EXPIRES, { platform: 'win32', run });

      expect(result).toBe(file);
      expect(calls.map(call => call.command)).toEqual(['whoami', 'icacls']);
      expect(calls[0].args).toEqual(['/user', '/fo', 'csv', '/nh']);
      expect(seen).toEqual({ path: calls[1].args[0], existed: true, size: 0 });
      const tempPath = calls[1].args[0];
      expect(path.dirname(tempPath)).toBe(dir);
      expect(tempPath.endsWith('.tmp')).toBe(true);
      expect(readFileSync(file, 'utf8')).toContain(`password: ${PAIR.password}`);
      expect(readdirSync(dir)).toEqual([SETUP_FILE_NAME]);
    });

    it('runs icacls with the exact argument array: no inheritance, full control for the user SID and Administrators', () => {
      const { run, calls } = fakeRun();

      writeSetupFile(dir, PAIR, EXPIRES, { platform: 'win32', run });

      expect(calls).toHaveLength(2);
      expect(calls[1].command).toBe('icacls');
      expect(calls[1].args.slice(1)).toEqual([
        '/inheritance:r',
        '/grant:r',
        '*S-1-5-21-111-222-333-1001:(F)',
        '*S-1-5-32-544:(F)',
      ]);
      expectNoPairInArgs(calls);
    });

    it('takes the SID from the second CSV field', () => {
      const { run, calls } = fakeRun(undefined, () => ({
        status: 0,
        stdout: '"CORP\\S-1-5-99 user","S-1-5-21-9-8-7-500"\r\n',
      }));

      writeSetupFile(dir, PAIR, EXPIRES, { platform: 'win32', run });

      expect(calls[1]?.args ?? []).toContain('*S-1-5-21-9-8-7-500:(F)');
    });

    it.each<[string, Run]>([
      ['whoami returns an error', () => ({ status: null, stdout: '', error: new Error('ENOENT') })],
      [
        'whoami throws',
        () => {
          throw new Error('spawn failed');
        },
      ],
      ['whoami exits non-zero', () => ({ status: 1, stdout: WHOAMI_OUT })],
      ['whoami output has no SID', () => ({ status: 0, stdout: '"CORP\\operator"\n' })],
      ['whoami output is empty', () => ({ status: 0, stdout: '' })],
    ])('throws a restriction error and leaves nothing behind when %s', (_name, whoami) => {
      const { run, calls } = fakeRun(undefined, whoami);

      const { message } = failureOf(run);

      expectCleanFailure(message);
      expect(readdirSync(dir)).toEqual([]);
      expectNoPairInArgs(calls);
    });

    it.each<[string, Run]>([
      ['icacls returns an error', () => ({ status: null, stdout: '', error: new Error('EACCES') })],
      [
        'icacls throws',
        () => {
          throw new Error('spawn failed');
        },
      ],
      ['icacls exits non-zero', () => ({ status: 5, stdout: 'Access is denied.' })],
    ])('throws a restriction error and leaves nothing behind when %s', (_name, icacls) => {
      const { run, calls } = fakeRun(icacls);

      const { message } = failureOf(run);

      expectCleanFailure(message);
      expect(readdirSync(dir)).toEqual([]);
      expectNoPairInArgs(calls);
    });

    it('rejects a whoami field that is not a SID, never calls icacls and leaves nothing behind', () => {
      const { run, calls } = fakeRun(undefined, () => ({
        status: 0,
        stdout: '"CORP\\operator","S-1-5-21-1;calc"\n',
      }));

      const { message } = failureOf(run);

      expectCleanFailure(message);
      expect(calls.map(call => call.command)).toEqual(['whoami']);
      expect(readdirSync(dir)).toEqual([]);
    });

    it('attaches a cause to the error and keeps the pair out of both messages', () => {
      const { run } = fakeRun(() => ({ status: 5, stdout: 'Access is denied.' }));
      let caught: unknown;

      try {
        writeSetupFile(dir, PAIR, EXPIRES, { platform: 'win32', run });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(Error);
      const cause = (caught as Error).cause;
      expect(cause).toBeInstanceOf(Error);
      const messages = [(caught as Error).message, (cause as Error).message];
      for (const text of messages) {
        expect(text).not.toContain(PAIR.password);
        expect(text).not.toContain(PAIR.username);
      }
    });

    it('never writes the pair into the temp file when restriction fails', () => {
      const contents: string[] = [];
      const { run } = fakeRun((_command, args) => {
        contents.push(readFileSync(args[0], 'utf8'));
        return { status: 1, stdout: '' };
      });

      const { message } = failureOf(run);

      expect(message).not.toBe('');
      expect(contents).toEqual(['']);
    });

    it('leaves an existing valid setup file unchanged when whoami fails', () => {
      writeSetupFile(dir, OTHER, EXPIRES, { platform: 'linux', run: fakeRun().run });
      const before = readFileSync(file, 'utf8');
      const { run } = fakeRun(undefined, () => ({ status: 1, stdout: '' }));

      const { message } = failureOf(run);

      expectCleanFailure(message);
      expect(readFileSync(file, 'utf8')).toBe(before);
      expect(readdirSync(dir)).toEqual([SETUP_FILE_NAME]);
    });

    it('leaves an existing valid setup file unchanged when icacls fails', () => {
      writeSetupFile(dir, OTHER, EXPIRES, { platform: 'linux', run: fakeRun().run });
      const before = readFileSync(file, 'utf8');
      const { run } = fakeRun(() => ({ status: 1, stdout: '' }));

      const { message } = failureOf(run);

      expectCleanFailure(message);
      expect(readFileSync(file, 'utf8')).toBe(before);
      expect(readdirSync(dir)).toEqual([SETUP_FILE_NAME]);
    });

    it.each<NodeJS.Platform>(['linux', 'darwin'])(
      'on %s spawns nothing and still writes the file atomically',
      platform => {
        const { run, calls } = fakeRun();

        const result = writeSetupFile(dir, PAIR, EXPIRES, { platform, run });

        expect(result).toBe(file);
        expect(calls).toEqual([]);
        expect(readFileSync(file, 'utf8')).toContain(`username: ${PAIR.username}`);
        expect(readdirSync(dir)).toEqual([SETUP_FILE_NAME]);
      },
    );
  });

  describe('readSetupFile', () => {
    it('reads back the pair and the expiry it wrote', () => {
      writeSetupFile(dir, PAIR, EXPIRES);

      const read = readSetupFile(dir);

      expect(read?.username).toBe(PAIR.username);
      expect(read?.password).toBe(PAIR.password);
      expect(new Date(read?.expires ?? '').toISOString()).toBe(EXPIRES.toISOString());
    });

    it('returns null when the file is missing', () => {
      expect(readSetupFile(dir)).toBeNull();
    });

    it('returns null when the path is a directory (unreadable)', () => {
      mkdirSync(file);

      expect(readSetupFile(dir)).toBeNull();
    });

    const good = [
      NOTICE,
      `username: ${PAIR.username}`,
      `password: ${PAIR.password}`,
      'expires: 2026-11-25T23:36:00.000Z',
    ];

    it.each([
      ['an empty file', ''],
      ['only three lines', `${good.slice(0, 3).join('\n')}\n`],
      ['five lines', `${[...good, 'extra: line'].join('\n')}\n`],
      ['a notice without the # prefix', `${['Aegis notice', ...good.slice(1)].join('\n')}\n`],
      [
        'a swapped username and password line',
        `${[good[0], good[2], good[1], good[3]].join('\n')}\n`,
      ],
      ['a wrong key', `${[good[0], 'user: x', good[2], good[3]].join('\n')}\n`],
      [
        'a missing space after the colon',
        `${[good[0], 'username:x', good[2], good[3]].join('\n')}\n`,
      ],
      [
        'an expires key that is misspelled',
        `${[...good.slice(0, 3), 'expiry: 2026-11-25T23:36:00.000Z'].join('\n')}\n`,
      ],
    ])('returns null for %s (fail closed)', (_name, content) => {
      writeFileSync(file, content);

      expect(readSetupFile(dir)).toBeNull();
    });
  });

  describe('removeSetupFile', () => {
    it('deletes the file', () => {
      writeSetupFile(dir, PAIR, EXPIRES);

      removeSetupFile(dir);

      expect(existsSync(file)).toBe(false);
    });

    it('ignores a missing file', () => {
      expect(() => removeSetupFile(dir)).not.toThrow();
    });

    it('rethrows an error other than ENOENT', () => {
      mkdirSync(path.join(file, 'child'), { recursive: true });

      expect(() => removeSetupFile(dir)).toThrow();
    });
  });
});
