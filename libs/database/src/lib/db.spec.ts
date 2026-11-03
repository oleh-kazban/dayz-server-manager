import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import { verifyPassword } from './crypto';
import { initDatabase } from './db';
import { runMigrations } from './migrations';
import { users } from './schema';

describe('Database Initialization & Seeding', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('initializes in-memory database and auto-seeds default admin', () => {
    const instance = initDatabase({ dbPath: ':memory:' });

    try {
      const seededUsers = instance.db.select().from(users).all();
      expect(seededUsers).toHaveLength(1);

      const admin = seededUsers[0];
      expect(admin.username).toBe('admin');
      expect(admin.role).toBe('admin');
      expect(verifyPassword('admin', admin.passwordHash)).toBe(true);

      const migrations = instance.sqlite.prepare('SELECT * FROM _dsm_migrations').all();
      expect(migrations).toHaveLength(1);
    } finally {
      instance.close();
    }
  });

  it('runs declarative migrations on an existing legacy database', () => {
    const legacyDb = new Database(':memory:');
    legacyDb.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    const columnsBefore = legacyDb.pragma('table_info(users)') as { name: string }[];
    const namesBefore = columnsBefore.map(c => c.name);
    expect(namesBefore).not.toContain('email');
    expect(namesBefore).not.toContain('last_login_at');
    expect(namesBefore).not.toContain('role');

    // Run declarative migrations on legacy database
    runMigrations(legacyDb);

    const columnsAfter = legacyDb.pragma('table_info(users)') as { name: string }[];
    const namesAfter = columnsAfter.map(c => c.name);
    expect(namesAfter).toContain('email');
    expect(namesAfter).toContain('last_login_at');
    expect(namesAfter).toContain('role');

    // Running migrations again is an idempotent no-op
    runMigrations(legacyDb);

    legacyDb.close();
  });

  it('requires explicit DSM_ADMIN_PASSWORD in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DSM_ADMIN_PASSWORD;

    expect(() => initDatabase({ dbPath: ':memory:' })).toThrow(
      'DSM_ADMIN_PASSWORD environment variable is required to bootstrap the database in production',
    );
  });

  it('bootstraps in production with provided DSM_ADMIN_PASSWORD', () => {
    process.env.NODE_ENV = 'production';
    process.env.DSM_ADMIN_PASSWORD = 'super-strong-production-pass!';

    const instance = initDatabase({ dbPath: ':memory:' });
    try {
      const seededUsers = instance.db.select().from(users).all();
      expect(seededUsers).toHaveLength(1);
      expect(verifyPassword('super-strong-production-pass!', seededUsers[0].passwordHash)).toBe(
        true,
      );
    } finally {
      instance.close();
    }
  });

  it('initializes file-based database and creates directory if missing', () => {
    const tempDir = path.resolve(process.cwd(), 'tmp/test-db');
    const tempDbPath = path.join(tempDir, 'temp.sqlite');

    try {
      const instance = initDatabase({ dbPath: tempDbPath });
      try {
        const seededUsers = instance.db.select().from(users).all();
        expect(seededUsers).toHaveLength(1);
      } finally {
        instance.close();
      }
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});
