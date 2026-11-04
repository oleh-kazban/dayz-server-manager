import type Database from 'better-sqlite3';

export interface DsmMigration {
  id: string;
  name: string;
  up: (sqlite: Database.Database) => void;
}

export const migrations: DsmMigration[] = [
  {
    id: '0001_initial_users',
    name: 'Create users table and indexes',
    up: (sqlite: Database.Database) => {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          email TEXT,
          role TEXT NOT NULL DEFAULT 'viewer',
          created_at INTEGER NOT NULL,
          last_login_at INTEGER
        );
      `);

      // Ensure backward-compatibility if an existing database was created with earlier schema
      const columns = sqlite.pragma('table_info(users)') as { name: string }[];
      const columnNames = new Set(columns.map(c => c.name));

      if (!columnNames.has('email')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN email TEXT;');
      }
      if (!columnNames.has('last_login_at')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN last_login_at INTEGER;');
      }
      if (!columnNames.has('role')) {
        sqlite.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer';");
      }
    },
  },
  {
    id: '0002_create_servers_table',
    name: 'Create servers table for multi-server management',
    up: (sqlite: Database.Database) => {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS servers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'stopped',
          install_path TEXT NOT NULL,
          profile_path TEXT NOT NULL,
          mission_path TEXT NOT NULL,
          game_port INTEGER NOT NULL DEFAULT 2302,
          query_port INTEGER NOT NULL DEFAULT 27016,
          rcon_port INTEGER NOT NULL DEFAULT 2310,
          rcon_password TEXT,
          launch_parameters TEXT,
          is_default INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
    },
  },
];

export function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _dsm_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  // Wrap migration discovery and execution in an IMMEDIATE transaction
  // to acquire SQLite write lock upfront and serialize concurrent process startup.
  const executeMigrations = sqlite.transaction(() => {
    const appliedRows = sqlite.prepare('SELECT id FROM _dsm_migrations').all() as { id: string }[];
    const appliedIds = new Set(appliedRows.map(r => r.id));

    for (const migration of migrations) {
      if (!appliedIds.has(migration.id)) {
        migration.up(sqlite);
        sqlite
          .prepare('INSERT INTO _dsm_migrations (id, name, applied_at) VALUES (?, ?, ?)')
          .run(migration.id, migration.name, Date.now());
      }
    }
  });

  executeMigrations.immediate();
}
