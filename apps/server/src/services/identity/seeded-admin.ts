import { and, eq, ne } from 'drizzle-orm';

import { sessions, UNUSABLE_PASSWORD_HASH, users, verifyPassword } from '@aegis/database';

import type { IdentityDeps } from './types';

export const SEEDED_ADMIN_USERNAME = 'admin';
export const SEEDED_ADMIN_EMAIL = 'admin@dsm.local';
// Only compared against, never used as an account password.
const LEGACY_DEFAULT_PASSWORD = 'admin';

const seededAdmin = and(
  eq(users.username, SEEDED_ADMIN_USERNAME),
  eq(users.email, SEEDED_ADMIN_EMAIL),
  eq(users.role, 'admin'),
);

/** The seeded account after `lockSeededAdmin` has run. */
export const lockedSeededAdminCondition = () =>
  and(seededAdmin, eq(users.passwordHash, UNUSABLE_PASSWORD_HASH));

/**
 * Makes the old seeded `admin` unusable when it still has the default password, and ends its
 * sessions. No such row, or a changed password, leaves everything untouched and runs no scrypt.
 */
export function lockSeededAdmin({ db, sqlite }: IdentityDeps): boolean {
  const row = db
    .select()
    .from(users)
    .where(and(seededAdmin, ne(users.passwordHash, UNUSABLE_PASSWORD_HASH)))
    .get();
  if (!row || !verifyPassword(LEGACY_DEFAULT_PASSWORD, row.passwordHash)) return false;

  sqlite
    .transaction(() => {
      db.update(users)
        .set({ passwordHash: UNUSABLE_PASSWORD_HASH })
        .where(and(eq(users.id, row.id), eq(users.passwordHash, row.passwordHash)))
        .run();
      db.delete(sessions).where(eq(sessions.userId, row.id)).run();
    })
    .immediate();
  return true;
}
