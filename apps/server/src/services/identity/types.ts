import type Database from 'better-sqlite3';

import type { DsmDatabase } from '@aegis/database';

export interface IdentityLog {
  info(message: string): void;
  warn(message: string): void;
}

export interface IdentityDeps {
  db: DsmDatabase;
  /** Raw handle for `transaction().immediate()`. */
  sqlite: Database.Database;
  dataDir: string;
  now?: () => Date;
  randomBytes?: (size: number) => Buffer;
  log: IdentityLog;
}

export interface IdentityStartupResult {
  setup: 'none' | 'created' | 'kept';
  filePath?: string;
  expiresAt?: Date;
  lockedSeededAdmin: boolean;
}
