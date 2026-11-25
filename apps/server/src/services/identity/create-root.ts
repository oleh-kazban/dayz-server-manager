import type Database from 'better-sqlite3';
import { eq, or } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { type DsmDatabase, hashPassword, type User, users } from '@aegis/database';

import { lockedSeededAdminCondition } from './seeded-admin';
import { isSetupExpired } from './setup-account';

export interface CreateRootDeps {
  db: DsmDatabase;
  sqlite: Database.Database;
  now?: () => Date;
}

export type CreateRootRefusal = 'already-complete' | 'caller-gone' | 'expired' | 'username-taken';
export type CreateRootResult = { ok: true; user: User } | { ok: false; reason: CreateRootRefusal };

class RootRefusal extends Error {
  constructor(readonly reason: CreateRootRefusal) {
    super(reason);
  }
}

/**
 * Replaces the setup account (and a locked seeded admin) with the root account in one immediate
 * transaction. A refusal or any failure rolls everything back. The setup file is not touched.
 */
export function createRoot(
  { db, sqlite, now = () => new Date() }: CreateRootDeps,
  input: { callerId: string; username: string; password: string },
): CreateRootResult {
  // Outside the transaction, so the write lock is held briefly.
  const passwordHash = hashPassword(input.password);

  try {
    const user = sqlite
      .transaction((): User => {
        if (db.select({ id: users.id }).from(users).where(eq(users.role, 'root')).get()) {
          throw new RootRefusal('already-complete');
        }
        const caller = db.select().from(users).where(eq(users.id, input.callerId)).get();
        if (!caller || caller.role !== 'setup') throw new RootRefusal('caller-gone');
        if (isSetupExpired(caller.createdAt, now())) throw new RootRefusal('expired');

        db.delete(users)
          .where(or(eq(users.role, 'setup'), lockedSeededAdminCondition()))
          .run();
        if (
          db.select({ id: users.id }).from(users).where(eq(users.username, input.username)).get()
        ) {
          throw new RootRefusal('username-taken');
        }
        return db
          .insert(users)
          .values({
            id: randomUUID(),
            username: input.username,
            passwordHash,
            role: 'root',
            createdAt: now(),
          })
          .returning()
          .get();
      })
      .immediate();
    return { ok: true, user };
  } catch (error) {
    if (error instanceof RootRefusal) return { ok: false, reason: error.reason };
    throw error;
  }
}
