import Database from 'better-sqlite3';
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { hashPassword } from './crypto';
import * as schema from './schema';

export interface DatabaseOptions {
  dbPath?: string;
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

  const sqlite = new Database(dbPath);

  // High-performance and data-integrity pragmas per PERSISTENCE_SPEC.md
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  // Automatically create tables if not existing
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

  const db = drizzle(sqlite, { schema });

  // Auto-seed initial operator if table is empty
  const existingCount = sqlite.prepare('SELECT count(*) as count FROM users').get() as {
    count: number;
  };

  if (existingCount.count === 0) {
    const defaultAdminId = crypto.randomUUID();
    const defaultAdminPass = process.env.DSM_ADMIN_PASSWORD || 'admin';

    db.insert(schema.users)
      .values({
        id: defaultAdminId,
        username: 'admin',
        email: 'admin@dsm.local',
        passwordHash: hashPassword(defaultAdminPass),
        role: 'admin',
        createdAt: new Date(),
      })
      .run();
  }

  return { db, sqlite, close: () => sqlite.close() };
}
