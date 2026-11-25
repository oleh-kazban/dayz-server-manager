import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import {
  existsSync,
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type DatabaseInstance,
  initDatabase,
  sessions,
  UNUSABLE_PASSWORD_HASH,
  users,
  verifyPassword,
} from '@aegis/database';

import { insertUser } from '../../__fixtures__/users';
import { buildApp } from '../../app/app';
import { loadEnv } from '../../config/env';

import { SETUP_FILE_NAME } from './setup-file';
import { type IdentityDeps, prepareIdentity } from './startup';

const NOTICE =
  '# Aegis first-time setup. Sign in with these credentials, then create the root account. Anyone who can read this file can sign in until it expires or is deleted.';
const T0 = new Date('2026-11-25T23:00:00.000Z');
const HOUR = 60 * 60 * 1000;

describe('prepareIdentity', () => {
  let dbi: DatabaseInstance;
  let dataDir: string;
  let file: string;
  let current: Date;
  let messages: string[];
  let consoleSpies: ReturnType<typeof vi.spyOn>[];

  const deps = (extra: Partial<IdentityDeps> = {}): IdentityDeps => ({
    db: dbi.db,
    sqlite: dbi.sqlite,
    dataDir,
    now: () => current,
    log: {
      info: message => messages.push(`info: ${message}`),
      warn: message => messages.push(`warn: ${message}`),
    },
    ...extra,
  });
  const setupRows = () => dbi.db.select().from(users).where(eq(users.role, 'setup')).all();
  const readFile = () => readFileSync(file, 'utf8').split('\n');
  const fileValue = (key: string) =>
    readFile()
      .find(line => line.startsWith(`${key}: `))
      ?.slice(key.length + 2) ?? '';
  const consoleCalls = () => consoleSpies.flatMap(spy => spy.mock.calls);
  const fixedRandom = (byte: number) => (size: number) => Buffer.alloc(size, byte);
  const addSession = (id: string, userId: string) =>
    dbi.db
      .insert(sessions)
      .values({
        id,
        userId,
        lastActiveAt: T0,
        createdAt: T0,
        expiresAt: new Date(T0.getTime() + HOUR),
      })
      .run();

  beforeEach(() => {
    dbi = initDatabase({ dbPath: ':memory:' });
    dataDir = mkdtempSync(path.join(tmpdir(), 'aegis-identity-'));
    file = path.join(dataDir, SETUP_FILE_NAME);
    current = new Date(T0);
    messages = [];
    consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(method =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dbi.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  describe('new setup account (AC-5)', () => {
    it('creates exactly one setup user with a random username and no email', () => {
      const result = prepareIdentity(deps());

      const rows = setupRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].username).toMatch(/^setup-[0-9a-f]{12}$/);
      expect(rows[0].email).toBeNull();
      expect(result.setup).toBe('created');
      expect(result.lockedSeededAdmin).toBe(false);
    });

    it('writes the four exact lines and the pair verifies against the stored hash only', () => {
      prepareIdentity(deps());

      const [row] = setupRows();
      const password = fileValue('password');
      expect(readFile()).toEqual([
        NOTICE,
        `username: ${row.username}`,
        `password: ${password}`,
        'expires: 2026-11-26T00:00:00.000Z',
        '',
      ]);
      expect(password.length).toBeGreaterThanOrEqual(24);
      expect(verifyPassword(password, row.passwordHash)).toBe(true);
      expect(row.passwordHash).not.toContain(password);
    });

    it('derives username and password from the injected random source', () => {
      prepareIdentity(deps({ randomBytes: fixedRandom(1) }));

      expect(setupRows()[0].username).toBe('setup-010101010101');
      expect(fileValue('password')).toBe(Buffer.alloc(24, 1).toString('base64url'));
    });

    it('stores createdAt at second resolution so the file and the database agree', () => {
      current = new Date('2026-11-25T23:00:00.789Z');

      const result = prepareIdentity(deps());

      expect(setupRows()[0].createdAt.getTime()).toBe(T0.getTime());
      expect(result.expiresAt?.toISOString()).toBe('2026-11-26T00:00:00.000Z');
      expect(fileValue('expires')).toBe('2026-11-26T00:00:00.000Z');
    });

    it('returns the file path and leaves only the file in the data dir', () => {
      const result = prepareIdentity(deps());

      expect(result.filePath).toBe(file);
      expect(readdirSync(dataDir)).toEqual([SETUP_FILE_NAME]);
    });

    it.skipIf(process.platform === 'win32')('writes the file with mode 0600', () => {
      prepareIdentity(deps());

      expect(statSync(file).mode & 0o777).toBe(0o600);
    });

    it('prints the path and the expiry once through log.warn and nothing else', () => {
      prepareIdentity(deps());

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/^warn: /);
      expect(messages[0]).toContain(file);
      expect(messages[0]).toContain('2026-11-26T00:00:00.000Z');
      expect(consoleCalls()).toHaveLength(0);
    });
  });

  describe('second start (AC-6)', () => {
    it('keeps a valid account and its file unchanged and prints the path again', () => {
      prepareIdentity(deps());
      const [before] = setupRows();
      const bytes = readFileSync(file, 'utf8');
      messages = [];

      const result = prepareIdentity(deps());

      expect(result.setup).toBe('kept');
      expect(result.filePath).toBe(file);
      expect(result.expiresAt?.toISOString()).toBe('2026-11-26T00:00:00.000Z');
      expect(setupRows()).toEqual([before]);
      expect(readFileSync(file, 'utf8')).toBe(bytes);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain(file);
    });

    it('keeps the account one second before it expires and replaces it at expiry', () => {
      prepareIdentity(deps());
      const [first] = setupRows();

      current = new Date(T0.getTime() + HOUR - 1000);
      expect(prepareIdentity(deps()).setup).toBe('kept');
      expect(setupRows()[0].id).toBe(first.id);

      current = new Date(T0.getTime() + HOUR);
      expect(prepareIdentity(deps()).setup).toBe('created');
      expect(setupRows()[0].id).not.toBe(first.id);
    });

    it.each([
      ['the file is missing', () => rmSync(file)],
      ['the file is garbage', () => writeFileSync(file, 'garbage\n')],
      [
        'the file password does not verify',
        () => writeFileSync(file, readFileSync(file, 'utf8').replace(/password: ./, 'password: #')),
      ],
      [
        'the file username differs from the account',
        () =>
          writeFileSync(
            file,
            readFileSync(file, 'utf8').replace('username: setup-', 'username: other-'),
          ),
      ],
    ])('replaces the account and the file when %s', (_name, damage) => {
      prepareIdentity(deps());
      const [old] = setupRows();
      damage();

      const result = prepareIdentity(deps());

      const rows = setupRows();
      expect(result.setup).toBe('created');
      expect(rows).toHaveLength(1);
      expect(rows[0].id).not.toBe(old.id);
      expect(fileValue('username')).toBe(rows[0].username);
      expect(verifyPassword(fileValue('password'), rows[0].passwordHash)).toBe(true);
    });

    it('replaces an expired account, deletes its sessions and renames a new file over the old one', () => {
      prepareIdentity(deps());
      const [old] = setupRows();
      const oldBytes = readFileSync(file, 'utf8');
      addSession('old-session', old.id);
      current = new Date(T0.getTime() + 2 * HOUR);

      const result = prepareIdentity(deps());

      const [fresh] = setupRows();
      expect(result.setup).toBe('created');
      expect(setupRows()).toHaveLength(1);
      expect(fresh.createdAt.getTime()).toBe(current.getTime());
      expect(dbi.db.select().from(sessions).all()).toHaveLength(0);
      expect(readFileSync(file, 'utf8')).not.toBe(oldBytes);
      expect(fileValue('expires')).toBe(new Date(current.getTime() + HOUR).toISOString());
      expect(readdirSync(dataDir)).toEqual([SETUP_FILE_NAME]);
    });

    it('never leaves more than one setup account when several exist', () => {
      insertUser(dbi, { role: 'setup', username: 'setup-aaaaaaaaaaaa', createdAt: T0 });
      insertUser(dbi, { role: 'setup', username: 'setup-bbbbbbbbbbbb', createdAt: T0 });

      const result = prepareIdentity(deps());

      expect(result.setup).toBe('created');
      expect(setupRows()).toHaveLength(1);
      expect(setupRows()[0].username).not.toMatch(/^setup-(a{12}|b{12})$/);
    });

    it('keeps other accounts and their sessions when it replaces the setup account', () => {
      const admin = insertUser(dbi, { role: 'admin', username: 'operator' });
      addSession('admin-session', admin.id);
      prepareIdentity(deps());
      current = new Date(T0.getTime() + 2 * HOUR);

      prepareIdentity(deps());

      expect(
        dbi.db
          .select()
          .from(sessions)
          .all()
          .map(s => s.id),
      ).toEqual(['admin-session']);
      expect(dbi.db.select().from(users).where(eq(users.id, admin.id)).all()).toHaveLength(1);
    });
  });

  describe('root exists (AC-7)', () => {
    beforeEach(() => {
      insertUser(dbi, { role: 'root', username: 'owner' });
    });

    it('creates no setup account, no file and prints nothing', () => {
      const result = prepareIdentity(deps());

      expect(result).toEqual({ setup: 'none', lockedSeededAdmin: false });
      expect(setupRows()).toHaveLength(0);
      expect(readdirSync(dataDir)).toEqual([]);
      expect(messages).toEqual([]);
      expect(consoleCalls()).toHaveLength(0);
    });

    it('deletes a leftover file and leftover setup rows without printing', () => {
      insertUser(dbi, { role: 'setup', username: 'setup-leftover0000', createdAt: T0 });
      writeFileSync(file, `${NOTICE}\nusername: setup-leftover0000\npassword: x\nexpires: y\n`);

      prepareIdentity(deps());

      expect(existsSync(file)).toBe(false);
      expect(setupRows()).toHaveLength(0);
      expect(messages).toEqual([]);
    });

    it('warns with the path only when the leftover file cannot be deleted and still succeeds', () => {
      mkdirSync(path.join(file, 'child'), { recursive: true });

      const result = prepareIdentity(deps());

      expect(result.setup).toBe('none');
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/^warn: /);
      expect(messages[0]).toContain(file);
    });
  });

  describe('buildApp (AC-7)', () => {
    it('creates no setup account and writes no file', async () => {
      const app = buildApp({
        config: loadEnv({
          SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
          LOG_LEVEL: 'silent',
        }),
        db: dbi,
        setupFileDir: dataDir,
      });
      await app.ready();
      await app.close();

      expect(dbi.db.select().from(users).all()).toHaveLength(0);
      expect(readdirSync(dataDir)).toEqual([]);
    });

    it('is referenced by main.ts only among the production sources outside the identity folder', () => {
      const srcDir = path.resolve(__dirname, '../..');
      const found: string[] = [];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (/\.ts$/.test(entry.name) && !/\.(spec|test)\.ts$/.test(entry.name)) {
            if (readFileSync(full, 'utf8').includes('prepareIdentity')) {
              found.push(path.relative(srcDir, full).split(path.sep).join('/'));
            }
          }
        }
      };
      walk(srcDir);

      expect(found.filter(name => !name.startsWith('services/identity/'))).toEqual(['main.ts']);
    });
  });

  describe('upgrade lock of the seeded admin (AC-9)', () => {
    const seeded = { username: 'admin', email: 'admin@dsm.local', role: 'admin' as const };
    const hashOf = (id: string) =>
      dbi.db.select().from(users).where(eq(users.id, id)).get()?.passwordHash;

    it('locks an admin whose password is still admin and reports it', () => {
      const admin = insertUser(dbi, { ...seeded, password: 'admin' });

      const result = prepareIdentity(deps());

      expect(result.lockedSeededAdmin).toBe(true);
      expect(hashOf(admin.id)).toBe(UNUSABLE_PASSWORD_HASH);
      expect(verifyPassword('admin', hashOf(admin.id) ?? '')).toBe(false);
      expect(dbi.db.select().from(users).where(eq(users.id, admin.id)).get()?.role).toBe('admin');
    });

    it('deletes the sessions of the locked account only', () => {
      const admin = insertUser(dbi, { ...seeded, password: 'admin' });
      const other = insertUser(dbi, { role: 'admin', username: 'operator' });
      addSession('locked-session', admin.id);
      addSession('other-session', other.id);

      prepareIdentity(deps());

      expect(
        dbi.db
          .select()
          .from(sessions)
          .all()
          .map(s => s.id),
      ).toEqual(['other-session']);
    });

    it('prints nothing about the lock', () => {
      insertUser(dbi, { role: 'root', username: 'owner' });
      insertUser(dbi, { ...seeded, password: 'admin' });

      prepareIdentity(deps());

      expect(messages).toEqual([]);
      expect(consoleCalls()).toHaveLength(0);
    });

    it('locks even when a root exists', () => {
      insertUser(dbi, { role: 'root', username: 'owner' });
      const admin = insertUser(dbi, { ...seeded, password: 'admin' });

      expect(prepareIdentity(deps()).lockedSeededAdmin).toBe(true);
      expect(hashOf(admin.id)).toBe(UNUSABLE_PASSWORD_HASH);
    });

    it('leaves an admin with a changed password untouched', () => {
      const admin = insertUser(dbi, { ...seeded, password: 'Changed-pass-1!' });
      const before = hashOf(admin.id);

      const result = prepareIdentity(deps());

      expect(result.lockedSeededAdmin).toBe(false);
      expect(hashOf(admin.id)).toBe(before);
      expect(verifyPassword('Changed-pass-1!', before ?? '')).toBe(true);
    });

    it.each([
      ['another email', { ...seeded, email: 'ops@example.test', password: 'admin' }],
      ['no email', { ...seeded, email: null, password: 'admin' }],
      ['another username', { ...seeded, username: 'operator', password: 'admin' }],
      ['the role root', { ...seeded, role: 'root' as const, password: 'admin' }],
    ])('never touches an account with %s even if its password is admin', (_name, options) => {
      const user = insertUser(dbi, options);
      const before = hashOf(user.id);

      const result = prepareIdentity(deps());

      expect(result.lockedSeededAdmin).toBe(false);
      expect(hashOf(user.id)).toBe(before);
    });

    it('never locks a setup account named admin (the lock ignores the role setup)', () => {
      const user = insertUser(dbi, { ...seeded, role: 'setup', password: 'admin' });

      const result = prepareIdentity(deps());

      expect(result.lockedSeededAdmin).toBe(false);
      expect(
        dbi.db
          .select()
          .from(users)
          .all()
          .filter(u => u.passwordHash === UNUSABLE_PASSWORD_HASH),
      ).toEqual([]);
      expect(user.role).toBe('setup');
    });

    it('promotes no account to root and keeps other admins usable', () => {
      insertUser(dbi, { ...seeded, password: 'admin' });
      const other = insertUser(dbi, { role: 'admin', username: 'operator' });

      prepareIdentity(deps());

      expect(dbi.db.select().from(users).where(eq(users.role, 'root')).all()).toHaveLength(0);
      expect(verifyPassword(other.password, hashOf(other.id) ?? '')).toBe(true);
    });

    it('runs no scrypt on a second start with the account already locked', () => {
      insertUser(dbi, { role: 'root', username: 'owner' });
      const admin = insertUser(dbi, { ...seeded, password: 'admin' });
      prepareIdentity(deps());
      const scrypt = vi.spyOn(crypto, 'scryptSync');

      const result = prepareIdentity(deps());

      expect(scrypt).not.toHaveBeenCalled();
      expect(result.lockedSeededAdmin).toBe(false);
      expect(hashOf(admin.id)).toBe(UNUSABLE_PASSWORD_HASH);
    });

    it('runs no scrypt when there is no seeded account at all', () => {
      insertUser(dbi, { role: 'root', username: 'owner' });
      const scrypt = vi.spyOn(crypto, 'scryptSync');

      prepareIdentity(deps());

      expect(scrypt).not.toHaveBeenCalled();
    });
  });

  describe('no credential leaves the process (AC-8)', () => {
    const PASSWORD = Buffer.alloc(24, 7).toString('base64url');
    const USERNAME = 'setup-070707070707';

    it('keeps password and username out of log, console and the result on success', () => {
      const result = prepareIdentity(deps({ randomBytes: fixedRandom(7) }));

      const captured = JSON.stringify([messages, consoleCalls(), result]);
      expect(fileValue('password')).toBe(PASSWORD);
      expect(captured).not.toContain(PASSWORD);
      expect(captured).not.toContain(USERNAME);
    });

    it('keeps password and username out of the thrown error and the log when the file cannot be written', () => {
      const blocker = path.join(dataDir, 'not-a-dir');
      writeFileSync(blocker, 'x');
      let thrown = '';

      try {
        prepareIdentity(deps({ dataDir: path.join(blocker, 'sub'), randomBytes: fixedRandom(7) }));
      } catch (error) {
        thrown = String(error);
      }

      const captured = JSON.stringify([thrown, messages, consoleCalls()]);
      expect(thrown).not.toBe('');
      expect(captured).not.toContain(PASSWORD);
      expect(captured).not.toContain(USERNAME);
    });

    it('rolls the account back and throws without the password when a directory is planted at the file', () => {
      mkdirSync(file);
      let thrown = '';

      try {
        prepareIdentity(deps({ randomBytes: fixedRandom(7) }));
      } catch (error) {
        thrown = String(error);
      }

      expect(thrown).not.toBe('');
      expect(thrown).not.toContain(PASSWORD);
      expect(setupRows()).toHaveLength(0);
    });

    it('rolls the account back when the file cannot be written', () => {
      const blocker = path.join(dataDir, 'not-a-dir');
      writeFileSync(blocker, 'x');

      expect(() => prepareIdentity(deps({ dataDir: path.join(blocker, 'sub') }))).toThrow();

      expect(setupRows()).toHaveLength(0);
    });
  });
});
