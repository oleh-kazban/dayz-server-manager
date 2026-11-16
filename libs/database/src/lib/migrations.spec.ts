import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./crypto', async importOriginal => {
  const actual = await importOriginal<typeof import('./crypto')>();
  return {
    ...actual,
    verifyVaultKey: vi.fn(actual.verifyVaultKey),
    decryptVaultSecret: vi.fn(actual.decryptVaultSecret),
  };
});

import { eq, getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/sqlite-core';

import { EMPTY_LAUNCH_OPTIONS } from '@aegis/api-contracts';

import * as actualCrypto from './crypto';
import { initDatabase } from './db';
import { convertLegacyLaunchParameters, migrations, runMigrations } from './migrations';
import { configEditLocks, serverConfigRevisions, servers, users } from './schema';

function seedPre0006Database(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _dsm_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const pre0006 = migrations.filter(m => m.id !== '0006_server_config_and_vault_secrets');
  const insertMigration = sqlite.prepare(
    'INSERT INTO _dsm_migrations (id, name, applied_at) VALUES (?, ?, ?)',
  );

  for (const migration of pre0006) {
    migration.up(sqlite);
    insertMigration.run(migration.id, migration.name, 1_700_000_000_000);
  }
}

const LEGACY_GAMEPLAY_COLUMNS: readonly [string, string][] = [
  ['disable_3rd_person', 'INTEGER NOT NULL DEFAULT 0'],
  ['disable_crosshair', 'INTEGER NOT NULL DEFAULT 0'],
  ['disable_von', 'INTEGER NOT NULL DEFAULT 0'],
  ['verify_signatures', 'INTEGER NOT NULL DEFAULT 1'],
  ['force_same_build', 'INTEGER NOT NULL DEFAULT 1'],
  ['server_time', "TEXT NOT NULL DEFAULT 'SystemTime'"],
  ['server_time_acceleration', 'REAL NOT NULL DEFAULT 1'],
  ['server_night_time_acceleration', 'REAL NOT NULL DEFAULT 1'],
  ['server_time_persistent', 'INTEGER NOT NULL DEFAULT 0'],
];

function insertLegacyServer(
  sqlite: Database.Database,
  row: {
    id: string;
    name: string;
    rconPassword: string | null;
  },
): void {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT INTO servers (
        id, name, status, install_path, profile_path, mission_path,
        game_port, query_port, rcon_port, rcon_password, is_default, created_at, updated_at
      ) VALUES (?, ?, 'stopped', ?, 'profiles', 'dayzOffline.chernarusplus', 2302, 27016, 2310, ?, 0, ?, ?)`,
    )
    .run(row.id, row.name, `C:\\servers\\${row.id}`, row.rconPassword, now, now);
}

describe('Database Migrations — 0006_server_config_and_vault_secrets', () => {
  let tempDir: string;
  let tempVaultDir: string;
  let savedSteamVaultKey: string | undefined;
  let savedDsmVaultKey: string | undefined;

  beforeEach(() => {
    savedSteamVaultKey = process.env.STEAM_VAULT_KEY;
    savedDsmVaultKey = process.env.DSM_VAULT_KEY;
    delete process.env.STEAM_VAULT_KEY;
    delete process.env.DSM_VAULT_KEY;

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-db-migrations-'));
    tempVaultDir = path.join(tempDir, 'vault');
    fs.mkdirSync(tempVaultDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (savedSteamVaultKey !== undefined) {
      process.env.STEAM_VAULT_KEY = savedSteamVaultKey;
    } else {
      delete process.env.STEAM_VAULT_KEY;
    }

    if (savedDsmVaultKey !== undefined) {
      process.env.DSM_VAULT_KEY = savedDsmVaultKey;
    } else {
      delete process.env.DSM_VAULT_KEY;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates the trimmed server config columns with expected defaults on a fresh database without touching vault key', () => {
    const sqlite = new Database(':memory:');
    try {
      runMigrations(sqlite, { vaultKeyDir: tempVaultDir });

      // Vault key must not be generated when there are no legacy plaintext RCON secrets
      expect(fs.existsSync(path.join(tempVaultDir, '.vault.key'))).toBe(false);

      const now = Date.now();
      sqlite
        .prepare(
          `INSERT INTO servers (
            id, name, install_path, profile_path, mission_path, created_at, updated_at
          ) VALUES (?, ?, ?, 'profiles', 'dayzOffline.chernarusplus', ?, ?)`,
        )
        .run('srv-fresh', 'Fresh Server', 'C:\\dayz', now, now);

      const inserted = sqlite
        .prepare(
          `SELECT
            max_players, rcon_ip, rcon_password_encrypted
          FROM servers WHERE id = ?`,
        )
        .get('srv-fresh') as Record<string, unknown>;

      expect(inserted).toEqual({
        max_players: 60,
        rcon_ip: '127.0.0.1',
        rcon_password_encrypted: null,
      });

      const columns = (sqlite.pragma('table_info(servers)') as { name: string }[]).map(c => c.name);
      expect(columns).not.toContain('password_admin_encrypted');
      expect(columns).not.toContain('server_password_encrypted');
      for (const gameplayColumn of LEGACY_GAMEPLAY_COLUMNS.map(([name]) => name)) {
        expect(columns).not.toContain(gameplayColumn);
      }
    } finally {
      sqlite.close();
    }
  });

  it('migrates legacy plaintext rcon_password rows into AES-256-GCM vault secrets and stays idempotent', () => {
    const sqlite = new Database(':memory:');
    try {
      seedPre0006Database(sqlite);
      insertLegacyServer(sqlite, {
        id: 'srv-secret-1',
        name: 'Legacy Secret 1',
        rconPassword: 'RconPass!99',
      });
      insertLegacyServer(sqlite, {
        id: 'srv-blank-2',
        name: 'Legacy Blank',
        rconPassword: '   ',
      });
      insertLegacyServer(sqlite, {
        id: 'srv-null-3',
        name: 'Legacy Null',
        rconPassword: null,
      });

      runMigrations(sqlite, { vaultKeyDir: tempVaultDir });

      const vaultKeyFile = path.join(tempVaultDir, '.vault.key');
      expect(fs.existsSync(vaultKeyFile)).toBe(true);
      const vaultKey = actualCrypto.resolveVaultKey(tempVaultDir);

      const row1 = sqlite
        .prepare('SELECT rcon_password, rcon_password_encrypted FROM servers WHERE id = ?')
        .get('srv-secret-1') as {
        rcon_password: string | null;
        rcon_password_encrypted: string | null;
      };

      expect(row1.rcon_password).toBeNull();
      expect(row1.rcon_password_encrypted).toBeTruthy();
      expect(
        actualCrypto.decryptVaultSecret(row1.rcon_password_encrypted as string, vaultKey),
      ).toBe('RconPass!99');

      const row2 = sqlite
        .prepare('SELECT rcon_password, rcon_password_encrypted FROM servers WHERE id = ?')
        .get('srv-blank-2') as {
        rcon_password: string | null;
        rcon_password_encrypted: string | null;
      };
      expect(row2.rcon_password).toBe('   ');
      expect(row2.rcon_password_encrypted).toBeNull();

      const row3 = sqlite
        .prepare('SELECT rcon_password, rcon_password_encrypted FROM servers WHERE id = ?')
        .get('srv-null-3') as {
        rcon_password: string | null;
        rcon_password_encrypted: string | null;
      };
      expect(row3.rcon_password).toBeNull();
      expect(row3.rcon_password_encrypted).toBeNull();

      const applied = sqlite.prepare('SELECT id FROM _dsm_migrations').all() as { id: string }[];
      expect(applied.map(r => r.id)).toContain('0006_server_config_and_vault_secrets');

      // Re-running migrations must be a no-op and preserve encrypted ciphertext
      const encryptedBefore = row1.rcon_password_encrypted;
      runMigrations(sqlite, { vaultKeyDir: tempVaultDir });
      const row1After = sqlite
        .prepare('SELECT rcon_password, rcon_password_encrypted FROM servers WHERE id = ?')
        .get('srv-secret-1') as {
        rcon_password: string | null;
        rcon_password_encrypted: string | null;
      };
      expect(row1After.rcon_password).toBeNull();
      expect(row1After.rcon_password_encrypted).toBe(encryptedBefore);
    } finally {
      sqlite.close();
    }
  });

  it('skips adding 0006 server columns that already exist when 0006 runs directly', () => {
    const sqlite = new Database(':memory:');
    try {
      seedPre0006Database(sqlite);
      sqlite.exec('ALTER TABLE servers ADD COLUMN max_players INTEGER NOT NULL DEFAULT 80;');

      runMigrations(sqlite, { vaultKeyDir: tempVaultDir });

      const columns = sqlite.pragma('table_info(servers)') as { name: string }[];
      const names = columns.map(c => c.name);
      expect(names).toContain('max_players');
      expect(names).toContain('rcon_ip');
      expect(names).toContain('rcon_password_encrypted');
    } finally {
      sqlite.close();
    }
  });

  it('fails closed and rolls back transaction when verifyVaultKey fails during legacy backfill', () => {
    const sqlite = new Database(':memory:');
    try {
      seedPre0006Database(sqlite);
      insertLegacyServer(sqlite, {
        id: 'srv-verify-fail',
        name: 'Verify Fail Server',
        rconPassword: 'SecretValue1',
      });

      vi.mocked(actualCrypto.verifyVaultKey).mockReturnValueOnce(false);

      expect(() => runMigrations(sqlite, { vaultKeyDir: tempVaultDir })).toThrow(
        'Vault key verification failed while migrating legacy RCON passwords',
      );

      // Atomic transaction rollback: neither migration record nor partial columns/clears persisted
      const applied = sqlite
        .prepare("SELECT id FROM _dsm_migrations WHERE id = '0006_server_config_and_vault_secrets'")
        .all();
      expect(applied).toHaveLength(0);

      const columns = sqlite.pragma('table_info(servers)') as { name: string }[];
      expect(columns.map(c => c.name)).not.toContain('rcon_password_encrypted');
    } finally {
      sqlite.close();
    }
  });

  it('fails closed and rolls back transaction when encrypted secret roundtrip verification fails', () => {
    const sqlite = new Database(':memory:');
    try {
      seedPre0006Database(sqlite);
      insertLegacyServer(sqlite, {
        id: 'srv-roundtrip-fail',
        name: 'Roundtrip Fail Server',
        rconPassword: 'SecretValue2',
      });

      vi.mocked(actualCrypto.decryptVaultSecret).mockReturnValueOnce('tampered-secret');

      expect(() => runMigrations(sqlite, { vaultKeyDir: tempVaultDir })).toThrow(
        "Encrypted RCON secret verification failed for server 'srv-roundtrip-fail'",
      );

      const applied = sqlite
        .prepare("SELECT id FROM _dsm_migrations WHERE id = '0006_server_config_and_vault_secrets'")
        .all();
      expect(applied).toHaveLength(0);

      const row = sqlite
        .prepare('SELECT rcon_password FROM servers WHERE id = ?')
        .get('srv-roundtrip-fail') as { rcon_password: string | null };
      expect(row.rcon_password).toBe('SecretValue2');
    } finally {
      sqlite.close();
    }
  });

  it('forwards vaultKeyDir from initDatabase options when upgrading a pre-0006 SQLite file', () => {
    const dbPath = path.join(tempDir, 'legacy.sqlite');
    const preSqlite = new Database(dbPath);
    try {
      seedPre0006Database(preSqlite);
      insertLegacyServer(preSqlite, {
        id: 'srv-initdb',
        name: 'InitDb Upgrade Server',
        rconPassword: 'FileDbSecret99',
      });
    } finally {
      preSqlite.close();
    }

    const instance = initDatabase({ dbPath, vaultKeyDir: tempVaultDir });
    try {
      const row = instance.sqlite
        .prepare('SELECT rcon_password, rcon_password_encrypted FROM servers WHERE id = ?')
        .get('srv-initdb') as {
        rcon_password: string | null;
        rcon_password_encrypted: string | null;
      };

      expect(row.rcon_password).toBeNull();
      expect(row.rcon_password_encrypted).toBeTruthy();

      const key = actualCrypto.resolveVaultKey(tempVaultDir);
      expect(actualCrypto.decryptVaultSecret(row.rcon_password_encrypted as string, key)).toBe(
        'FileDbSecret99',
      );
    } finally {
      instance.close();
    }
  });
});

const MIGRATION_0007_ID = '0007_server_config_editor';
const MIGRATION_0008_ID = '0008_admin_only_and_relative_profile_path';

function findMigration(id: string) {
  const migration = migrations.find(m => m.id === id);
  if (!migration) {
    throw new Error(`Migration ${id} is not registered`);
  }
  return migration;
}

function seedLegacy0006Database(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _dsm_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);
  const insertMigration = sqlite.prepare(
    'INSERT INTO _dsm_migrations (id, name, applied_at) VALUES (?, ?, ?)',
  );
  for (const migration of migrations.filter(m => m.id < MIGRATION_0007_ID)) {
    migration.up(sqlite);
    insertMigration.run(migration.id, migration.name, 1_700_000_000_000);
  }
  for (const [name, definition] of LEGACY_GAMEPLAY_COLUMNS) {
    sqlite.exec(`ALTER TABLE servers ADD COLUMN ${name} ${definition};`);
  }
}

function columnsOf(sqlite: Database.Database, table: string) {
  return (
    sqlite.pragma(`table_info(${table})`) as { name: string; notnull: number; pk: number }[]
  ).map(({ name, notnull, pk }) => ({ name, notnull, pk }));
}

function foreignKeysOf(sqlite: Database.Database, table: string) {
  return (
    sqlite.pragma(`foreign_key_list(${table})`) as {
      table: string;
      from: string;
      to: string;
      on_delete: string;
    }[]
  )
    .map(({ table: target, from, to, on_delete }) => ({ target, from, to, onDelete: on_delete }))
    .sort((a, b) => a.from.localeCompare(b.from));
}

function countRows(sqlite: Database.Database, table: string): number {
  return (sqlite.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number })
    .count;
}

function insertServerRow(sqlite: Database.Database, id: string): void {
  sqlite
    .prepare(
      `INSERT INTO servers (id, name, install_path, profile_path, mission_path, created_at, updated_at)
       VALUES (?, ?, ?, 'profiles', 'dayzOffline.chernarusplus', 1, 1)`,
    )
    .run(id, id, `/opt/${id}`);
}

describe('Database Migrations — 0007_server_config_editor', () => {
  it('creates config_edit_locks with a composite primary key and cascading foreign keys', () => {
    const sqlite = new Database(':memory:');
    try {
      runMigrations(sqlite);

      expect(columnsOf(sqlite, 'config_edit_locks')).toEqual([
        { name: 'server_id', notnull: 1, pk: 1 },
        { name: 'file_kind', notnull: 1, pk: 2 },
        { name: 'session_token', notnull: 1, pk: 0 },
        { name: 'user_id', notnull: 1, pk: 0 },
        { name: 'acquired_at', notnull: 1, pk: 0 },
        { name: 'expires_at', notnull: 1, pk: 0 },
      ]);
      expect(foreignKeysOf(sqlite, 'config_edit_locks')).toEqual([
        { target: 'servers', from: 'server_id', to: 'id', onDelete: 'CASCADE' },
        { target: 'users', from: 'user_id', to: 'id', onDelete: 'CASCADE' },
      ]);
    } finally {
      sqlite.close();
    }
  });

  it('creates server_config_revisions with a nullable SET NULL author and a descending created_at index', () => {
    const sqlite = new Database(':memory:');
    try {
      runMigrations(sqlite);

      expect(columnsOf(sqlite, 'server_config_revisions')).toEqual([
        { name: 'id', notnull: 0, pk: 1 },
        { name: 'server_id', notnull: 1, pk: 0 },
        { name: 'file_kind', notnull: 1, pk: 0 },
        { name: 'content', notnull: 1, pk: 0 },
        { name: 'content_hash', notnull: 1, pk: 0 },
        { name: 'source', notnull: 1, pk: 0 },
        { name: 'user_id', notnull: 0, pk: 0 },
        { name: 'created_at', notnull: 1, pk: 0 },
      ]);
      expect(foreignKeysOf(sqlite, 'server_config_revisions')).toEqual([
        { target: 'servers', from: 'server_id', to: 'id', onDelete: 'CASCADE' },
        { target: 'users', from: 'user_id', to: 'id', onDelete: 'SET NULL' },
      ]);

      const indexColumns = (
        sqlite.pragma('index_xinfo(idx_server_config_revisions_server_kind_created)') as {
          name: string | null;
          desc: number;
          key: number;
        }[]
      )
        .filter(column => column.key === 1)
        .map(({ name, desc }) => ({ name, desc }));
      expect(indexColumns).toEqual([
        { name: 'server_id', desc: 0 },
        { name: 'file_kind', desc: 0 },
        { name: 'created_at', desc: 1 },
      ]);
    } finally {
      sqlite.close();
    }
  });

  it('enforces one lock per server and file kind and cascades or nullifies on server and user deletion', () => {
    const instance = initDatabase({ dbPath: ':memory:' });
    try {
      const { db, sqlite } = instance;
      const now = new Date(1_700_000_000_123);
      db.insert(users)
        .values({
          id: 'user-editor',
          username: 'editor',
          passwordHash: 'x',
          role: 'admin',
          createdAt: now,
        })
        .run();
      insertServerRow(sqlite, 'srv-a');
      insertServerRow(sqlite, 'srv-b');

      const lockRow = {
        serverId: 'srv-a',
        fileKind: 'server_dz' as const,
        sessionToken: 'tab-1',
        userId: 'user-editor',
        acquiredAt: now,
        expiresAt: new Date(now.getTime() + 120_000),
      };
      db.insert(configEditLocks).values(lockRow).run();
      expect(() =>
        db
          .insert(configEditLocks)
          .values({ ...lockRow, sessionToken: 'tab-2' })
          .run(),
      ).toThrow(/UNIQUE constraint failed/);
      expect(() =>
        db
          .insert(configEditLocks)
          .values({ ...lockRow, serverId: 'srv-missing' })
          .run(),
      ).toThrow(/FOREIGN KEY constraint failed/);

      for (const [id, serverId] of [
        ['rev-a', 'srv-a'],
        ['rev-b', 'srv-b'],
      ]) {
        db.insert(serverConfigRevisions)
          .values({
            id,
            serverId,
            fileKind: 'server_dz',
            content: 'password = "plain-secret";',
            contentHash: 'c'.repeat(64),
            source: 'editor',
            userId: 'user-editor',
            createdAt: now,
          })
          .run();
      }
      expect(
        sqlite.prepare("SELECT created_at FROM server_config_revisions WHERE id = 'rev-a'").get(),
      ).toEqual({ created_at: 1_700_000_000_123 });

      db.delete(users).where(eq(users.id, 'user-editor')).run();
      expect(countRows(sqlite, 'config_edit_locks')).toBe(0);
      expect(
        db
          .select({ id: serverConfigRevisions.id, userId: serverConfigRevisions.userId })
          .from(serverConfigRevisions)
          .all(),
      ).toEqual([
        { id: 'rev-a', userId: null },
        { id: 'rev-b', userId: null },
      ]);

      db.delete(servers).where(eq(servers.id, 'srv-a')).run();
      expect(db.select({ id: serverConfigRevisions.id }).from(serverConfigRevisions).all()).toEqual(
        [{ id: 'rev-b' }],
      );
    } finally {
      instance.close();
    }
  });

  it('cascades lock deletion when the server is deleted', () => {
    const instance = initDatabase({ dbPath: ':memory:' });
    try {
      const { sqlite } = instance;
      const admin = sqlite.prepare('SELECT id FROM users LIMIT 1').get() as { id: string };
      insertServerRow(sqlite, 'srv-locked');
      sqlite
        .prepare(
          `INSERT INTO config_edit_locks (server_id, file_kind, session_token, user_id, acquired_at, expires_at)
           VALUES ('srv-locked', 'server_dz', 'tab-1', ?, 1, 2)`,
        )
        .run(admin.id);

      sqlite.prepare("DELETE FROM servers WHERE id = 'srv-locked'").run();

      expect(countRows(sqlite, 'config_edit_locks')).toBe(0);
    } finally {
      instance.close();
    }
  });

  it.each([
    {
      table: configEditLocks,
      expected: [
        { from: 'server_id', target: 'servers', to: 'id', onDelete: 'cascade' },
        { from: 'user_id', target: 'users', to: 'id', onDelete: 'cascade' },
      ],
      primaryKey: ['server_id', 'file_kind'],
    },
    {
      table: serverConfigRevisions,
      expected: [
        { from: 'server_id', target: 'servers', to: 'id', onDelete: 'cascade' },
        { from: 'user_id', target: 'users', to: 'id', onDelete: 'set null' },
      ],
      primaryKey: [],
    },
  ])(
    'declares the same foreign keys and primary key in the Drizzle schema as migration 0007 ($table._.name)',
    ({ table, expected, primaryKey }) => {
      const config = getTableConfig(table);
      const foreignKeys = config.foreignKeys
        .map(fk => {
          const reference = fk.reference();
          return {
            from: reference.columns.map(column => column.name).join(','),
            target: getTableName(reference.foreignTable),
            to: reference.foreignColumns.map(column => column.name).join(','),
            onDelete: fk.onDelete,
          };
        })
        .sort((a, b) => a.from.localeCompare(b.from));
      expect(foreignKeys).toEqual(expected);
      expect(config.primaryKeys.flatMap(pk => pk.columns.map(column => column.name))).toEqual(
        primaryKey,
      );
    },
  );

  it('is idempotent when re-run directly and through runMigrations', () => {
    const sqlite = new Database(':memory:');
    try {
      runMigrations(sqlite);
      insertServerRow(sqlite, 'srv-1');
      sqlite
        .prepare(
          `INSERT INTO server_config_revisions (id, server_id, file_kind, content, content_hash, source, user_id, created_at)
           VALUES ('rev-1', 'srv-1', 'server_dz', 'x', ?, 'external', NULL, 1)`,
        )
        .run('d'.repeat(64));

      expect(() => findMigration(MIGRATION_0007_ID).up(sqlite)).not.toThrow();
      runMigrations(sqlite);

      expect(countRows(sqlite, 'server_config_revisions')).toBe(1);
      expect(
        sqlite
          .prepare('SELECT count(*) AS count FROM _dsm_migrations WHERE id = ?')
          .get(MIGRATION_0007_ID),
      ).toEqual({ count: 1 });
    } finally {
      sqlite.close();
    }
  });

  describe('upgrading a database that applied the old 0006 with gameplay columns', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-db-0007-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('applies only 0007, keeps the legacy columns intact and lets the trimmed schema insert rows', () => {
      const dbPath = path.join(tempDir, 'legacy-0006.sqlite');
      const legacy = new Database(dbPath);
      try {
        seedLegacy0006Database(legacy);
        legacy
          .prepare(
            `INSERT INTO servers (id, name, install_path, profile_path, mission_path, created_at, updated_at, disable_3rd_person, server_time)
             VALUES ('srv-legacy', 'Legacy', '/opt/legacy', 'profiles', 'dayzOffline.chernarusplus', 1, 1, 1, '2026/01/01/08/00')`,
          )
          .run();
        expect(
          legacy.prepare("SELECT name FROM sqlite_master WHERE name = 'config_edit_locks'").get(),
        ).toBeUndefined();
      } finally {
        legacy.close();
      }

      const instance = initDatabase({ dbPath, vaultKeyDir: path.join(tempDir, 'vault') });
      try {
        const { db, sqlite } = instance;
        const newlyApplied = (
          sqlite.prepare('SELECT id, applied_at FROM _dsm_migrations ORDER BY id').all() as {
            id: string;
            applied_at: number;
          }[]
        ).filter(row => row.applied_at !== 1_700_000_000_000);
        expect(newlyApplied.map(row => row.id)).toEqual([
          MIGRATION_0007_ID,
          MIGRATION_0008_ID,
          MIGRATION_0009_ID,
        ]);

        expect(
          sqlite
            .prepare('SELECT disable_3rd_person, server_time FROM servers WHERE id = ?')
            .get('srv-legacy'),
        ).toEqual({ disable_3rd_person: 1, server_time: '2026/01/01/08/00' });

        const now = new Date();
        db.insert(servers)
          .values({
            id: 'srv-new',
            name: 'New',
            installPath: '/opt/new',
            profilePath: 'profiles',
            missionPath: 'dayzOffline.enoch',
            createdAt: now,
            updatedAt: now,
          })
          .run();
        expect(
          sqlite
            .prepare('SELECT verify_signatures, server_time, max_players FROM servers WHERE id = ?')
            .get('srv-new'),
        ).toEqual({ verify_signatures: 1, server_time: 'SystemTime', max_players: 60 });

        db.insert(serverConfigRevisions)
          .values({
            id: 'rev-legacy',
            serverId: 'srv-legacy',
            fileKind: 'server_dz',
            content: 'hostname = "Legacy";',
            contentHash: 'e'.repeat(64),
            source: 'external',
            userId: null,
            createdAt: now,
          })
          .run();
        expect(db.select().from(serverConfigRevisions).all()).toEqual([
          expect.objectContaining({ id: 'rev-legacy', serverId: 'srv-legacy', userId: null }),
        ]);
      } finally {
        instance.close();
      }
    });
  });
});

describe('Database Migrations — 0008_admin_only_and_relative_profile_path', () => {
  function seedPre0008Database(sqlite: Database.Database): void {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS _dsm_migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    const insertMigration = sqlite.prepare(
      'INSERT INTO _dsm_migrations (id, name, applied_at) VALUES (?, ?, ?)',
    );
    for (const migration of migrations.filter(m => m.id < MIGRATION_0008_ID)) {
      migration.up(sqlite);
      insertMigration.run(migration.id, migration.name, 1_700_000_000_000);
    }
  }

  it('normalizes legacy roles to admin and legacy profile paths to "profiles", and is idempotent', () => {
    const sqlite = new Database(':memory:');
    try {
      seedPre0008Database(sqlite);

      const insertUser = sqlite.prepare(
        `INSERT INTO users (id, username, password_hash, role, created_at)
         VALUES (?, ?, 'hash', ?, 1)`,
      );
      insertUser.run('u-admin', 'admin1', 'admin');
      insertUser.run('u-mod', 'mod1', 'moderator');
      insertUser.run('u-view', 'view1', 'viewer');

      const insertServer = sqlite.prepare(
        `INSERT INTO servers (id, name, install_path, profile_path, mission_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'mpmissions\\dayzOffline.chernarusplus', 1, 1)`,
      );
      insertServer.run('srv-win', 'Win Legacy', 'D:\\DayZServer', 'D:\\DayZServer\\profiles');
      insertServer.run('srv-linux', 'Linux Legacy', '/opt/dayz', '/opt/dayz/custom-profiles');
      insertServer.run('srv-rel', 'Rel Legacy', 'C:\\DayZ', 'profiles\\namalsk');
      insertServer.run('srv-clean', 'Already Clean', 'C:\\DayZ2', 'profiles');

      runMigrations(sqlite);

      expect(sqlite.prepare('SELECT id, role FROM users ORDER BY id').all()).toEqual([
        { id: 'u-admin', role: 'admin' },
        { id: 'u-mod', role: 'admin' },
        { id: 'u-view', role: 'admin' },
      ]);
      expect(sqlite.prepare('SELECT id, profile_path FROM servers ORDER BY id').all()).toEqual([
        { id: 'srv-clean', profile_path: 'profiles' },
        { id: 'srv-linux', profile_path: 'profiles' },
        { id: 'srv-rel', profile_path: 'profiles' },
        { id: 'srv-win', profile_path: 'profiles' },
      ]);

      expect(() => findMigration(MIGRATION_0008_ID).up(sqlite)).not.toThrow();
      runMigrations(sqlite);

      expect(
        sqlite
          .prepare('SELECT count(*) AS count FROM _dsm_migrations WHERE id = ?')
          .get(MIGRATION_0008_ID),
      ).toEqual({ count: 1 });
    } finally {
      sqlite.close();
    }
  });
});

const MIGRATION_0009_ID = '0009_structured_launch_options';

describe('convertLegacyLaunchParameters', () => {
  it('maps supported flags case-insensitively and drops everything else', () => {
    expect(
      convertLegacyLaunchParameters(
        '-config=serverDZ.cfg -CPUCOUNT=8 -limitFPS=120 -doLogs -adminlog -NetLog -freezeCheck -scriptDebug=true -filePatching -mod=@CF -cpuCount=abc -limitFPS -unknown',
      ),
    ).toEqual({
      options: {
        cpuCount: 8,
        limitFPS: 120,
        doLogs: true,
        adminLog: true,
        netLog: true,
        freezeCheck: true,
        scriptDebug: true,
        filePatching: true,
      },
      droppedTokens: ['-config=serverDZ.cfg', '-mod=@CF', '-cpuCount=abc', '-limitFPS', '-unknown'],
    });
  });

  it('drops out-of-range numeric values', () => {
    expect(convertLegacyLaunchParameters('-cpuCount=0 -cpuCount=65 -limitFPS=201')).toEqual({
      options: EMPTY_LAUNCH_OPTIONS,
      droppedTokens: ['-cpuCount=0', '-cpuCount=65', '-limitFPS=201'],
    });
  });

  it.each([null, undefined, '', '   '])('converts %j to no flags', text => {
    expect(convertLegacyLaunchParameters(text)).toEqual({
      options: EMPTY_LAUNCH_OPTIONS,
      droppedTokens: [],
    });
  });
});

describe('Database Migrations — 0009_structured_launch_options', () => {
  function seedPre0009Database(sqlite: Database.Database): void {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS _dsm_migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);
    const insertMigration = sqlite.prepare(
      'INSERT INTO _dsm_migrations (id, name, applied_at) VALUES (?, ?, ?)',
    );
    for (const migration of migrations.filter(m => m.id < MIGRATION_0009_ID)) {
      migration.up(sqlite);
      insertMigration.run(migration.id, migration.name, 1_700_000_000_000);
    }
  }

  it('converts legacy launch_parameters, drops the column, logs dropped tokens and is idempotent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const sqlite = new Database(':memory:');
    try {
      seedPre0009Database(sqlite);
      const insertServer = sqlite.prepare(
        `INSERT INTO servers (id, name, install_path, profile_path, mission_path, launch_parameters, created_at, updated_at)
         VALUES (?, ?, '/opt/dayz', 'profiles', 'mpmissions/dayzOffline.chernarusplus', ?, 1, 1)`,
      );
      insertServer.run('srv-default', 'Default', '-cpuCount=4 -doLogs -adminLog -netLog');
      insertServer.run('srv-null', 'Null', null);
      insertServer.run('srv-managed', 'Managed', '-port=2302 -freezeCheck');

      runMigrations(sqlite);

      const columns = (sqlite.pragma('table_info(servers)') as { name: string }[]).map(c => c.name);
      expect(columns).toContain('launch_options');
      expect(columns).not.toContain('launch_parameters');

      const rows = sqlite.prepare('SELECT id, launch_options FROM servers ORDER BY id').all() as {
        id: string;
        launch_options: string;
      }[];
      expect(Object.fromEntries(rows.map(r => [r.id, JSON.parse(r.launch_options)]))).toEqual({
        'srv-default': {
          ...EMPTY_LAUNCH_OPTIONS,
          cpuCount: 4,
          doLogs: true,
          adminLog: true,
          netLog: true,
        },
        'srv-managed': { ...EMPTY_LAUNCH_OPTIONS, freezeCheck: true },
        'srv-null': EMPTY_LAUNCH_OPTIONS,
      });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("'srv-managed'"));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('-port=2302'));

      expect(() => findMigration(MIGRATION_0009_ID).up(sqlite)).not.toThrow();
      runMigrations(sqlite);
      expect(
        sqlite
          .prepare('SELECT count(*) AS count FROM _dsm_migrations WHERE id = ?')
          .get(MIGRATION_0009_ID),
      ).toEqual({ count: 1 });
    } finally {
      sqlite.close();
      warn.mockRestore();
    }
  });

  it('lets drizzle round-trip launch options on a fresh database', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-0009-'));
    const instance = initDatabase({
      dbPath: path.join(tempDir, 'fresh.sqlite'),
      vaultKeyDir: path.join(tempDir, 'vault'),
    });
    try {
      const { db } = instance;
      const now = new Date();
      db.insert(servers)
        .values({
          id: 'srv-a',
          name: 'A',
          installPath: '/opt/a',
          profilePath: 'profiles',
          missionPath: 'm',
          createdAt: now,
          updatedAt: now,
        })
        .run();
      db.insert(servers)
        .values({
          id: 'srv-b',
          name: 'B',
          installPath: '/opt/b',
          profilePath: 'profiles',
          missionPath: 'm',
          launchOptions: { ...EMPTY_LAUNCH_OPTIONS, limitFPS: 60 },
          createdAt: now,
          updatedAt: now,
        })
        .run();
      expect(db.select().from(servers).where(eq(servers.id, 'srv-a')).get()?.launchOptions).toEqual(
        EMPTY_LAUNCH_OPTIONS,
      );
      expect(db.select().from(servers).where(eq(servers.id, 'srv-b')).get()?.launchOptions).toEqual(
        {
          ...EMPTY_LAUNCH_OPTIONS,
          limitFPS: 60,
        },
      );
    } finally {
      instance.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
