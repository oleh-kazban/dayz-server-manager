import Database from 'better-sqlite3';
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { hashPassword } from './crypto';
import { runMigrations } from './migrations';
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

  const sqlite = new Database(dbPath, { timeout: 5000 });

  // High-performance and data-integrity pragmas per PERSISTENCE_SPEC.md
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');

  // Run declarative migrations
  runMigrations(sqlite);

  const db = drizzle(sqlite, { schema });

  // Auto-seed initial operator if table is empty
  const existingCount = sqlite.prepare('SELECT count(*) as count FROM users').get() as {
    count: number;
  };

  if (existingCount.count === 0) {
    if (process.env.NODE_ENV === 'production' && !process.env.DSM_ADMIN_PASSWORD) {
      sqlite.close();
      throw new Error(
        'DSM_ADMIN_PASSWORD environment variable is required to bootstrap the database in production',
      );
    }

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

  // Auto-seed initial default server instance if servers table is empty
  const existingServersCount = sqlite.prepare('SELECT count(*) as count FROM servers').get() as {
    count: number;
  };

  if (existingServersCount.count === 0) {
    const defaultServerId = crypto.randomUUID();
    const now = new Date();

    db.insert(schema.servers)
      .values({
        id: defaultServerId,
        name: 'DayZ (Local)',
        description: 'Default local DayZ Dedicated Server instance',
        status: 'stopped',
        installPath: path.resolve(process.cwd(), 'server-data/dayz-server'),
        profilePath: path.resolve(process.cwd(), 'server-data/dayz-server/profiles'),
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2310,
        rconPassword: null,
        launchParameters: '[]',
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  return { db, sqlite, close: () => sqlite.close() };
}
