import type Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';

import { type DsmDatabase, users } from '@aegis/database';

import { lockSeededAdmin } from './seeded-admin';
import { ensureSetupAccount } from './setup-account';
import { removeSetupFile } from './setup-file';

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

/** The only start-up entry for identity; `main.ts` calls it after `buildApp`, before `listen`. */
export function prepareIdentity(deps: IdentityDeps): IdentityStartupResult {
  const { db, dataDir, log } = deps;
  const lockedSeededAdmin = lockSeededAdmin(deps);

  if (db.select({ id: users.id }).from(users).where(eq(users.role, 'root')).get()) {
    db.delete(users).where(eq(users.role, 'setup')).run();
    try {
      removeSetupFile(dataDir);
    } catch (error) {
      const file = (error as NodeJS.ErrnoException).path ?? dataDir;
      log.warn(`Could not delete the leftover setup credentials file ${file}`);
    }
    return { setup: 'none', lockedSeededAdmin };
  }

  const { state, filePath, expiresAt } = ensureSetupAccount(deps);
  log.warn(
    `First-time setup: sign in with the credentials in ${filePath} (valid until ${expiresAt.toISOString()}). Create the root account on the setup screen.`,
  );
  return { setup: state, filePath, expiresAt, lockedSeededAdmin };
}
