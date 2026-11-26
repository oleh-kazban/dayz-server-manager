import { randomUUID } from 'node:crypto';

import type { UserRole } from '@aegis/api-contracts';

import { hashPassword } from '../crypto';
import type { DsmDatabase } from '../db';
import { users } from '../schema';

export const DEFAULT_TEST_PASSWORD = 'Test-Pass-123!';

export interface TestUserOptions {
  id?: string;
  username?: string;
  password?: string;
  role?: UserRole;
  email?: string | null;
  createdAt?: Date;
}

/** Inserts one user and returns its id and the plain password. Test-only: no production import. */
export function insertTestUser(
  db: DsmDatabase,
  options: TestUserOptions = {},
): { id: string; username: string; password: string } {
  const id = options.id ?? randomUUID();
  const username = options.username ?? `user-${id.slice(0, 8)}`;
  const password = options.password ?? DEFAULT_TEST_PASSWORD;
  db.insert(users)
    .values({
      id,
      username,
      email: options.email ?? null,
      passwordHash: hashPassword(password),
      role: options.role ?? 'admin',
      createdAt: options.createdAt ?? new Date(),
    })
    .run();
  return { id, username, password };
}
