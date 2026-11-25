import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type DatabaseInstance,
  initDatabase,
  sessions,
  UNUSABLE_PASSWORD_HASH,
  users,
  verifyPassword,
} from '@aegis/database';

import { insertUser } from '../../__fixtures__/users';

import { createRoot, type CreateRootDeps } from './create-root';

const T0 = new Date('2026-11-25T23:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const PASSWORD = 'Root-Pass-123!';

describe('createRoot', () => {
  let dbi: DatabaseInstance;
  let current: Date;
  let setupId: string;

  const deps = (): CreateRootDeps => ({ db: dbi.db, sqlite: dbi.sqlite, now: () => current });
  const run = (username = 'owner', callerId = setupId) =>
    createRoot(deps(), { callerId, username, password: PASSWORD });
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
  const rows = () =>
    dbi.db
      .select()
      .from(users)
      .all()
      .map(u => `${u.role}:${u.username}`)
      .sort();
  const sessionIds = () =>
    dbi.db
      .select()
      .from(sessions)
      .all()
      .map(s => s.id)
      .sort();
  /** A locked account as the upgrade lock leaves it. */
  const addLockedAdmin = () => {
    const admin = insertUser(dbi, {
      username: 'admin',
      email: 'admin@dsm.local',
      role: 'admin',
    });
    dbi.db
      .update(users)
      .set({ passwordHash: UNUSABLE_PASSWORD_HASH })
      .where(eq(users.id, admin.id))
      .run();
    return admin;
  };

  beforeEach(() => {
    dbi = initDatabase({ dbPath: ':memory:' });
    current = new Date(T0.getTime() + 10 * 60 * 1000);
    setupId = insertUser(dbi, { role: 'setup', username: 'setup-1a2b3c4d5e6f', createdAt: T0 }).id;
  });

  afterEach(() => {
    dbi.close();
  });

  describe('success (AC-11)', () => {
    it('returns the new root user and leaves exactly one root with a verifying hash', () => {
      const result = run();

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.user.role).toBe('root');
      expect(result.user.username).toBe('owner');
      const stored = dbi.db.select().from(users).where(eq(users.role, 'root')).all();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(result.user.id);
      expect(verifyPassword(PASSWORD, stored[0].passwordHash)).toBe(true);
      expect(stored[0].passwordHash).not.toContain(PASSWORD);
      expect(stored[0].createdAt.getTime()).toBe(current.getTime());
    });

    it('deletes the setup account and its sessions and keeps other accounts and sessions', () => {
      const admin = insertUser(dbi, { role: 'admin', username: 'operator' });
      addSession('setup-session', setupId);
      addSession('admin-session', admin.id);

      run();

      expect(rows()).toEqual(['admin:operator', 'root:owner']);
      expect(sessionIds()).toEqual(['admin-session']);
    });

    it('deletes a locked seeded admin with its sessions and allows root to take the name admin', () => {
      const locked = addLockedAdmin();
      addSession('locked-session', locked.id);

      const result = run('admin');

      expect(result.ok).toBe(true);
      expect(rows()).toEqual(['root:admin']);
      expect(sessionIds()).toEqual([]);
    });

    it('keeps the content of config revisions and nulls the author of a deleted account', () => {
      dbi.sqlite
        .prepare(
          `INSERT INTO servers (id, name, install_path, profile_path, mission_path, created_at, updated_at)
           VALUES ('srv-1', 'srv-1', '/opt/srv-1', 'profiles', 'dayzOffline.chernarusplus', 1, 1)`,
        )
        .run();
      dbi.sqlite
        .prepare(
          `INSERT INTO server_config_revisions (id, server_id, file_kind, content, content_hash, source, user_id, created_at)
           VALUES ('rev-1', 'srv-1', 'server_dz', 'hostname = "x";', ?, 'external', ?, 1)`,
        )
        .run('d'.repeat(64), setupId);

      run();

      const revision = dbi.sqlite
        .prepare('SELECT content, user_id FROM server_config_revisions WHERE id = ?')
        .get('rev-1');
      expect(revision).toEqual({ content: 'hostname = "x";', user_id: null });
    });

    it('does not put the password into the returned value', () => {
      const result = run();

      expect(JSON.stringify(result)).not.toContain(PASSWORD);
    });

    it('accepts a caller one second before the setup account expires', () => {
      current = new Date(T0.getTime() + HOUR - 1000);

      expect(run().ok).toBe(true);
    });
  });

  describe('refusals leave everything unchanged (AC-12, AC-13)', () => {
    const snapshot = () => ({
      users: dbi.db.select().from(users).all(),
      sessions: dbi.db.select().from(sessions).all(),
    });

    it('answers already-complete when a root exists', () => {
      insertUser(dbi, { role: 'root', username: 'first-root' });
      addSession('setup-session', setupId);
      const before = snapshot();

      expect(run()).toEqual({ ok: false, reason: 'already-complete' });
      expect(snapshot()).toEqual(before);
    });

    it('checks the existing root before the caller', () => {
      insertUser(dbi, { role: 'root', username: 'first-root' });

      expect(run('owner', 'missing-id')).toEqual({ ok: false, reason: 'already-complete' });
    });

    it('answers caller-gone when the caller row is missing', () => {
      const before = snapshot();

      expect(run('owner', 'missing-id')).toEqual({ ok: false, reason: 'caller-gone' });
      expect(snapshot()).toEqual(before);
    });

    it('answers caller-gone when the caller is not a setup account', () => {
      const admin = insertUser(dbi, { role: 'admin', username: 'operator' });

      expect(run('owner', admin.id)).toEqual({ ok: false, reason: 'caller-gone' });
      expect(rows()).toEqual(['admin:operator', 'setup:setup-1a2b3c4d5e6f']);
    });

    it('answers expired at exactly 60 minutes and changes nothing', () => {
      current = new Date(T0.getTime() + HOUR);
      const before = snapshot();

      expect(run()).toEqual({ ok: false, reason: 'expired' });
      expect(snapshot()).toEqual(before);
    });

    it('answers expired before username-taken', () => {
      insertUser(dbi, { role: 'admin', username: 'owner' });
      current = new Date(T0.getTime() + 2 * HOUR);

      expect(run()).toEqual({ ok: false, reason: 'expired' });
    });

    it('answers username-taken and restores the setup account and the locked admin', () => {
      insertUser(dbi, { role: 'admin', username: 'owner' });
      const locked = addLockedAdmin();
      addSession('setup-session', setupId);
      addSession('locked-session', locked.id);
      const before = snapshot();

      expect(run('owner')).toEqual({ ok: false, reason: 'username-taken' });
      expect(snapshot()).toEqual(before);
    });

    it('treats an unlocked seeded admin as taken and keeps it', () => {
      const admin = insertUser(dbi, {
        username: 'admin',
        email: 'admin@dsm.local',
        role: 'admin',
        password: 'Changed-pass-1!',
      });

      expect(run('admin')).toEqual({ ok: false, reason: 'username-taken' });
      expect(dbi.db.select().from(users).where(eq(users.id, admin.id)).all()).toHaveLength(1);
      expect(rows()).toContain('setup:setup-1a2b3c4d5e6f');
    });

    it('does not delete an admin named admin with another email', () => {
      const other = insertUser(dbi, {
        username: 'admin',
        email: 'ops@example.test',
        role: 'admin',
      });
      dbi.db
        .update(users)
        .set({ passwordHash: UNUSABLE_PASSWORD_HASH })
        .where(eq(users.id, other.id))
        .run();

      expect(run('owner').ok).toBe(true);
      expect(rows()).toEqual(['admin:admin', 'root:owner']);
    });

    it('refuses a second call with the same caller after success', () => {
      expect(run().ok).toBe(true);

      expect(run('second-root')).toEqual({ ok: false, reason: 'already-complete' });
      expect(rows()).toEqual(['root:owner']);
    });
  });

  describe('a failing step (AC-13a)', () => {
    it('rolls everything back and propagates the error when the root insert throws', () => {
      const locked = addLockedAdmin();
      addSession('setup-session', setupId);
      addSession('locked-session', locked.id);
      dbi.sqlite.exec(`
        CREATE TRIGGER fail_root_insert BEFORE INSERT ON users
        WHEN NEW.role = 'root'
        BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;
      `);
      const before = {
        users: dbi.db.select().from(users).all(),
        sessions: dbi.db.select().from(sessions).all(),
      };

      expect(() => run('owner')).toThrow('simulated failure');

      expect(dbi.db.select().from(users).all()).toEqual(before.users);
      expect(dbi.db.select().from(sessions).all()).toEqual(before.sessions);
      expect(dbi.sqlite.inTransaction).toBe(false);
    });
  });
});
