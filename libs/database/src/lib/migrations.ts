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
  {
    id: '0003_profile_and_sessions',
    name: 'Add operator profile fields and sessions table',
    up: (sqlite: Database.Database) => {
      // 1. Additive columns for users
      const columns = sqlite.pragma('table_info(users)') as { name: string }[];
      const names = new Set(columns.map(c => c.name));

      if (!names.has('display_name')) {
        sqlite.exec('ALTER TABLE users ADD COLUMN display_name TEXT;');
      }
      if (!names.has('timezone')) {
        sqlite.exec("ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';");
      }
      if (!names.has('time_format')) {
        sqlite.exec("ALTER TABLE users ADD COLUMN time_format TEXT NOT NULL DEFAULT '24h';");
      }

      // 2. Create stateful sessions table with indexes
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_agent TEXT,
          ip_address TEXT,
          last_active_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      `);
    },
  },
  {
    id: '0004_steam_settings',
    name: 'Create steam_settings singleton table and default row',
    up: (sqlite: Database.Database) => {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS steam_settings (
          id TEXT PRIMARY KEY,
          steam_cmd_path TEXT NOT NULL,
          steam_workshop_path TEXT NOT NULL,
          steam_meta_path TEXT NOT NULL,
          auth_mode TEXT NOT NULL DEFAULT 'anonymous',
          steam_username TEXT,
          steam_password_encrypted TEXT,
          game_server_app_id INTEGER NOT NULL DEFAULT 223350,
          workshop_app_id INTEGER NOT NULL DEFAULT 221100,
          branch TEXT NOT NULL DEFAULT 'public',
          branch_password_encrypted TEXT,
          session_status TEXT NOT NULL DEFAULT 'UNAUTHENTICATED',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        -- Self-heal any legacy millisecond timestamps inserted by earlier builds
        UPDATE steam_settings
        SET created_at = CAST(created_at / 1000 AS INTEGER),
            updated_at = CAST(updated_at / 1000 AS INTEGER)
        WHERE created_at > 10000000000;
      `);

      const existing = sqlite.prepare('SELECT id FROM steam_settings WHERE id = ?').get('default');

      if (!existing) {
        const now = Math.floor(Date.now() / 1000);
        const defaultCmd =
          process.platform === 'win32' ? 'C:\\steamcmd\\steamcmd.exe' : '/usr/games/steamcmd';
        const defaultWorkshop =
          process.platform === 'win32'
            ? 'C:\\DayZServer\\steamapps\\workshop'
            : '/var/dayz/workshop';
        const defaultMeta =
          process.platform === 'win32' ? 'C:\\DayZServer\\steamapps' : '/var/dayz/steamapps';

        sqlite
          .prepare(
            `
            INSERT INTO steam_settings (
              id,
              steam_cmd_path,
              steam_workshop_path,
              steam_meta_path,
              auth_mode,
              game_server_app_id,
              workshop_app_id,
              branch,
              session_status,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          )
          .run(
            'default',
            defaultCmd,
            defaultWorkshop,
            defaultMeta,
            'anonymous',
            223350,
            221100,
            'public',
            'UNAUTHENTICATED',
            now,
            now,
          );
      }
    },
  },
  {
    id: '0005_server_mods_and_steam_api_key',
    name: 'Add steam_web_api_key_encrypted column and server_mods table',
    up: (sqlite: Database.Database) => {
      const steamCols = sqlite.pragma('table_info(steam_settings)') as { name: string }[];
      const steamColNames = new Set(steamCols.map(c => c.name));

      if (!steamColNames.has('steam_web_api_key_encrypted')) {
        sqlite.exec('ALTER TABLE steam_settings ADD COLUMN steam_web_api_key_encrypted TEXT;');
      }

      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS server_mods (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
          source_type TEXT NOT NULL DEFAULT 'workshop',
          load_target TEXT NOT NULL DEFAULT 'client_server',
          workshop_id TEXT,
          folder_name TEXT NOT NULL,
          name TEXT NOT NULL,
          size_bytes INTEGER,
          remote_updated_at INTEGER,
          synced_workshop_updated_at INTEGER,
          last_synced_at INTEGER,
          enabled INTEGER NOT NULL DEFAULT 1,
          load_order INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_server_mods_server_order
          ON server_mods(server_id, load_order);

        CREATE UNIQUE INDEX IF NOT EXISTS uq_server_mods_server_workshop
          ON server_mods(server_id, workshop_id)
          WHERE workshop_id IS NOT NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS uq_server_mods_server_folder
          ON server_mods(server_id, lower(folder_name))
          WHERE folder_name != '';
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
