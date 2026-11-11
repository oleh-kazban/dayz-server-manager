import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

import { verifyPassword } from './crypto';
import { initDatabase } from './db';
import { runMigrations } from './migrations';
import { serverMods, servers, sessions, steamSettings, users } from './schema';

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
      expect(migrations).toHaveLength(5);
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

  describe('Migration 0005 (server_mods & steam_web_api_key_encrypted)', () => {
    function seedTestServer(
      instance: ReturnType<typeof initDatabase>,
      id: string,
      name: string,
    ): void {
      const now = new Date();
      instance.db
        .insert(servers)
        .values({
          id,
          name,
          status: 'stopped',
          installPath: `/opt/dayz/${name}`,
          profilePath: `/opt/dayz/${name}/profiles`,
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
          gamePort: 2302,
          queryPort: 27016,
          rconPort: 2310,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    it('adds steam_web_api_key_encrypted column and creates server_mods table & indexes idempotently', () => {
      const instance = initDatabase({ dbPath: ':memory:' });
      try {
        const steamCols = instance.sqlite.pragma("table_info('steam_settings')") as {
          name: string;
        }[];
        expect(steamCols.map(c => c.name)).toContain('steam_web_api_key_encrypted');

        const defaultSteam = instance.db
          .select()
          .from(steamSettings)
          .where(eq(steamSettings.id, 'default'))
          .get();
        expect(defaultSteam?.steamWebApiKeyEncrypted).toBeNull();

        const modCols = instance.sqlite.pragma("table_info('server_mods')") as {
          name: string;
        }[];
        expect(modCols.map(c => c.name)).toEqual(
          expect.arrayContaining([
            'id',
            'server_id',
            'source_type',
            'load_target',
            'workshop_id',
            'folder_name',
            'name',
            'size_bytes',
            'remote_updated_at',
            'synced_workshop_updated_at',
            'last_synced_at',
            'enabled',
            'load_order',
            'created_at',
            'updated_at',
          ]),
        );

        const indexes = instance.sqlite
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'server_mods'",
          )
          .all() as { name: string }[];
        expect(indexes.map(i => i.name)).toEqual(
          expect.arrayContaining([
            'idx_server_mods_server_order',
            'uq_server_mods_server_workshop',
            'uq_server_mods_server_folder',
          ]),
        );

        // Idempotent re-run
        runMigrations(instance.sqlite);
        const migrations = instance.sqlite.prepare('SELECT * FROM _dsm_migrations').all();
        expect(migrations).toHaveLength(5);
      } finally {
        instance.close();
      }
    });

    it('enforces partial unique indexes on workshop_id and case-insensitive folder_name while allowing multiple local/empty-folder mods', () => {
      const instance = initDatabase({ dbPath: ':memory:' });
      try {
        const serverA = '11111111-1111-4111-a111-111111111111';
        const serverB = '22222222-2222-4222-8222-222222222222';
        seedTestServer(instance, serverA, 'Server A');
        seedTestServer(instance, serverB, 'Server B');
        const now = new Date();

        // Multiple local mods (workshopId = null) allowed on same server
        instance.db
          .insert(serverMods)
          .values([
            {
              id: 'mod-local-1',
              serverId: serverA,
              sourceType: 'local',
              loadTarget: 'server_only',
              workshopId: null,
              folderName: '@LocalOne',
              name: 'Local One',
              loadOrder: 0,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 'mod-local-2',
              serverId: serverA,
              sourceType: 'local',
              loadTarget: 'server_only',
              workshopId: null,
              folderName: '@LocalTwo',
              name: 'Local Two',
              loadOrder: 1,
              createdAt: now,
              updatedAt: now,
            },
          ])
          .run();

        // Multiple workshop mods with empty folderName = '' allowed on same server
        instance.db
          .insert(serverMods)
          .values([
            {
              id: 'mod-ws-1',
              serverId: serverA,
              sourceType: 'workshop',
              loadTarget: 'client_server',
              workshopId: '1559212036',
              folderName: '',
              name: 'CF',
              loadOrder: 2,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 'mod-ws-2',
              serverId: serverA,
              sourceType: 'workshop',
              loadTarget: 'client_server',
              workshopId: '1564026768',
              folderName: '',
              name: 'Community-Online-Tools',
              loadOrder: 3,
              createdAt: now,
              updatedAt: now,
            },
          ])
          .run();

        // Duplicate (server_id, workshop_id) rejected
        expect(() =>
          instance.db
            .insert(serverMods)
            .values({
              id: 'mod-ws-dup',
              serverId: serverA,
              sourceType: 'workshop',
              loadTarget: 'client_server',
              workshopId: '1559212036',
              folderName: '@CF_Copy',
              name: 'CF Dup',
              loadOrder: 4,
              createdAt: now,
              updatedAt: now,
            })
            .run(),
        ).toThrow();

        // Case-insensitive duplicate (server_id, lower(folder_name)) rejected
        expect(() =>
          instance.db
            .insert(serverMods)
            .values({
              id: 'mod-folder-dup',
              serverId: serverA,
              sourceType: 'local',
              loadTarget: 'server_only',
              workshopId: null,
              folderName: '@localone',
              name: 'Local One Case Collision',
              loadOrder: 4,
              createdAt: now,
              updatedAt: now,
            })
            .run(),
        ).toThrow();

        // Same workshopId and folderName allowed on a different server
        instance.db
          .insert(serverMods)
          .values({
            id: 'mod-server-b',
            serverId: serverB,
            sourceType: 'workshop',
            loadTarget: 'client_server',
            workshopId: '1559212036',
            folderName: '@LocalOne',
            name: 'CF on Server B',
            loadOrder: 0,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        expect(instance.db.select().from(serverMods).all()).toHaveLength(5);
      } finally {
        instance.close();
      }
    });

    it('cascades deletion of server_mods when parent server is deleted', () => {
      const instance = initDatabase({ dbPath: ':memory:' });
      try {
        const serverA = '11111111-1111-4111-a111-111111111111';
        const serverB = '22222222-2222-4222-8222-222222222222';
        seedTestServer(instance, serverA, 'Server A');
        seedTestServer(instance, serverB, 'Server B');
        const now = new Date();

        instance.db
          .insert(serverMods)
          .values([
            {
              id: 'mod-a1',
              serverId: serverA,
              sourceType: 'workshop',
              loadTarget: 'client_server',
              workshopId: '1559212036',
              folderName: '@CF',
              name: 'CF',
              loadOrder: 0,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 'mod-b1',
              serverId: serverB,
              sourceType: 'workshop',
              loadTarget: 'client_server',
              workshopId: '1559212036',
              folderName: '@CF',
              name: 'CF',
              loadOrder: 0,
              createdAt: now,
              updatedAt: now,
            },
          ])
          .run();

        instance.db.delete(servers).where(eq(servers.id, serverA)).run();

        const remaining = instance.db.select().from(serverMods).all();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe('mod-b1');
      } finally {
        instance.close();
      }
    });
  });
});
