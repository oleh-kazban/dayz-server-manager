import Database from 'better-sqlite3';
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

import { runMigrations } from './migrations';
import * as schema from './schema';

export interface DatabaseOptions {
  dbPath?: string;
  vaultKeyDir?: string;
}

export type DsmDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseInstance {
  db: DsmDatabase;
  sqlite: Database.Database;
  close: () => void;
}

export function initDatabase(options: DatabaseOptions = {}): DatabaseInstance {
  const dbPath =
    options.dbPath || path.resolve(process.cwd(), 'manager-data/database/manager.sqlite');

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(dbPath, { timeout: 5000 });

  // High-performance and data-integrity pragmas per PERSISTENCE_SPEC.md
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');

  // Run declarative migrations
  runMigrations(sqlite, { vaultKeyDir: options.vaultKeyDir });

  const db = drizzle(sqlite, { schema });

  return { db, sqlite, close: () => sqlite.close() };
}
