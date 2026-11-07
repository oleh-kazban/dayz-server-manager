import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

import { verifyPassword } from './crypto';
import { initDatabase } from './db';
import { runMigrations } from './migrations';
import { servers, sessions, users } from './schema';

describe('Database Initialization & Seeding', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('initializes in-memory database and auto-seeds default admin with zero servers (clean slate)', () => {
    const instance = initDatabase({ dbPath: ':memory:' });

    try {
      const seededUsers = instance.db.select().from(users).all();
      expect(seededUsers).toHaveLength(1);

      const admin = seededUsers[0];
      expect(admin.username).toBe('admin');
      expect(admin.role).toBe('admin');
      expect(verifyPassword('admin', admin.passwordHash)).toBe(true);

      const seededServers = instance.db.select().from(servers).all();
      expect(seededServers).toHaveLength(0);

      const migrations = instance.sqlite.prepare('SELECT * FROM _dsm_migrations').all();
      expect(migrations).toHaveLength(3);
    } finally {
      instance.close();
    }
  });

  it('verifies migration 0003_profile_and_sessions up routine, columns, indexes, and cascades', () => {
    const instance = initDatabase({ dbPath: ':memory:' });
    try {
      // Check additive columns in users
      const userCols = instance.sqlite.prepare("PRAGMA table_info('users')").all() as {
        name: string;
      }[];
      const colNames = userCols.map(c => c.name);
      expect(colNames).toContain('display_name');
      expect(colNames).toContain('timezone');
      expect(colNames).toContain('time_format');

      // Check sessions table exists
      const sessionCols = instance.sqlite.prepare("PRAGMA table_info('sessions')").all() as {
        name: string;
      }[];
      expect(sessionCols.length).toBeGreaterThan(0);

      // Verify sessions table operations
      const admin = instance.db.select().from(users).all()[0];
      const now = new Date();
      instance.db
        .insert(sessions)
        .values({
          id: 'sess-test-cascade',
          userId: admin.id,
          userAgent: 'Test Agent',
          ipAddress: '127.0.0.1',
          lastActiveAt: now,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 86400000),
        })
        .run();

      const inserted = instance.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, 'sess-test-cascade'))
        .all();
      expect(inserted).toHaveLength(1);

      // Verify foreign key cascade deletion
      instance.db.delete(users).where(eq(users.id, admin.id)).run();
      const remaining = instance.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, 'sess-test-cascade'))
        .all();
      expect(remaining).toHaveLength(0);

      // Exercise Drizzle schema foreign key definition
      const fkSymbols = Object.getOwnPropertySymbols(sessions);
      const inlineFkSymbol = fkSymbols.find(
        s => s.description === 'drizzle:SQLiteInlineForeignKeys',
      );
      if (inlineFkSymbol) {
        const fks = (
          sessions as unknown as Record<
            symbol,
            { reference: () => { columns: unknown[]; foreignColumns: unknown[] } }[]
          >
        )[inlineFkSymbol];
        expect(fks).toBeDefined();
        if (fks && fks[0]) {
          const resolved = fks[0].reference();
          expect(resolved.columns[0]).toBe(sessions.userId);
          expect(resolved.foreignColumns[0]).toBe(users.id);
        }
      }
    } finally {
      instance.close();
    }
  });

  it('does not duplicate admin if already populated and maintains zero initial servers', () => {
    const tempDir = path.resolve(process.cwd(), 'tmp/test-seed-db');
    const tempDbPath = path.join(tempDir, 'seed.sqlite');

    try {
      const firstInstance = initDatabase({ dbPath: tempDbPath });
      firstInstance.close();

      const secondInstance = initDatabase({ dbPath: tempDbPath });
      try {
        const seededUsers = secondInstance.db.select().from(users).all();
        expect(seededUsers).toHaveLength(1);

        const seededServers = secondInstance.db.select().from(servers).all();
        expect(seededServers).toHaveLength(0);
      } finally {
        secondInstance.close();
      }
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
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

    // Verify servers table was created by migration 0002
    const serverColumns = legacyDb.pragma('table_info(servers)') as { name: string }[];
    const serverColumnNames = serverColumns.map(c => c.name);
    expect(serverColumnNames).toContain('id');
    expect(serverColumnNames).toContain('name');
    expect(serverColumnNames).toContain('game_port');
    expect(serverColumnNames).toContain('query_port');
    expect(serverColumnNames).toContain('rcon_port');
    expect(serverColumnNames).toContain('is_default');

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
