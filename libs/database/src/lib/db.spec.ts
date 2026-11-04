import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import { verifyPassword } from './crypto';
import { initDatabase } from './db';
import { runMigrations } from './migrations';
import { servers, users } from './schema';

describe('Database Initialization & Seeding', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('initializes in-memory database and auto-seeds default admin and default server', () => {
    const instance = initDatabase({ dbPath: ':memory:' });

    try {
      const seededUsers = instance.db.select().from(users).all();
      expect(seededUsers).toHaveLength(1);

      const admin = seededUsers[0];
      expect(admin.username).toBe('admin');
      expect(admin.role).toBe('admin');
      expect(verifyPassword('admin', admin.passwordHash)).toBe(true);

      const seededServers = instance.db.select().from(servers).all();
      expect(seededServers).toHaveLength(1);

      const defaultServer = seededServers[0];
      expect(defaultServer.name).toBe('DayZ (Local)');
      expect(defaultServer.isDefault).toBe(true);
      expect(defaultServer.status).toBe('stopped');
      expect(defaultServer.gamePort).toBe(2302);
      expect(defaultServer.queryPort).toBe(27016);
      expect(defaultServer.rconPort).toBe(2310);
      expect(defaultServer.missionPath).toBe('mpmissions/dayzOffline.chernarusplus');

      const migrations = instance.sqlite.prepare('SELECT * FROM _dsm_migrations').all();
      expect(migrations).toHaveLength(2);
    } finally {
      instance.close();
    }
  });

  it('does not duplicate admin or default server if already populated', () => {
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
        expect(seededServers).toHaveLength(1);
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
