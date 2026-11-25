import { eq } from 'drizzle-orm';
import { randomBytes as nodeRandomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';

import { hashPassword, users, verifyPassword } from '@aegis/database';

import { readSetupFile, SETUP_FILE_NAME, writeSetupFile } from './setup-file';
import type { IdentityDeps } from './startup';

export const SETUP_ACCOUNT_TTL_MS = 60 * 60 * 1000;

// `users.createdAt` has second resolution, so the setup window does too.
export function setupExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SETUP_ACCOUNT_TTL_MS);
}

export function isSetupExpired(createdAt: Date, now: Date): boolean {
  return now.getTime() >= setupExpiresAt(createdAt).getTime();
}

export interface SetupAccountResult {
  state: 'created' | 'kept';
  filePath: string;
  expiresAt: Date;
}

/**
 * Keeps a valid setup account whose file still verifies, otherwise replaces account and file in
 * one immediate transaction (a failed file write rolls the account back).
 */
export function ensureSetupAccount(deps: IdentityDeps): SetupAccountResult {
  const { db, sqlite, dataDir } = deps;
  const now = deps.now ?? (() => new Date());
  const random = deps.randomBytes ?? nodeRandomBytes;

  return sqlite
    .transaction((): SetupAccountResult => {
      const rows = db.select().from(users).where(eq(users.role, 'setup')).all();
      const [row] = rows;
      if (rows.length === 1 && !isSetupExpired(row.createdAt, now())) {
        const pair = readSetupFile(dataDir);
        if (
          pair &&
          pair.username === row.username &&
          verifyPassword(pair.password, row.passwordHash)
        ) {
          return {
            state: 'kept',
            filePath: path.join(dataDir, SETUP_FILE_NAME),
            expiresAt: setupExpiresAt(row.createdAt),
          };
        }
      }

      db.delete(users).where(eq(users.role, 'setup')).run();
      const createdAt = new Date(Math.floor(now().getTime() / 1000) * 1000);
      const username = `setup-${random(6).toString('hex')}`;
      const password = random(24).toString('base64url');
      db.insert(users)
        .values({
          id: randomUUID(),
          username,
          passwordHash: hashPassword(password),
          role: 'setup',
          createdAt,
        })
        .run();
      const expiresAt = setupExpiresAt(createdAt);
      const filePath = writeSetupFile(dataDir, { username, password }, expiresAt);
      return { state: 'created', filePath, expiresAt };
    })
    .immediate();
}
