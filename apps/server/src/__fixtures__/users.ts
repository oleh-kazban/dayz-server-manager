import { randomUUID } from 'node:crypto';

import type { UserRole } from '@aegis/api-contracts';
import { type DsmDatabase, hashPassword, users } from '@aegis/database';

export const DEFAULT_TEST_PASSWORD = 'Test-Pass-123!';

export interface InsertUserOptions {
  id?: string;
  username?: string;
  password?: string;
  role?: UserRole;
  email?: string | null;
  createdAt?: Date;
}

export interface InsertedUser {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  password: string;
  /** Body for POST /api/v1/auth/login. */
  credentials: { usernameOrEmail: string; password: string };
}

/** Inserts a user row (default role admin) and returns what a login needs. Test-only. */
export function insertUser(
  target: { db: DsmDatabase },
  options: InsertUserOptions = {},
): InsertedUser {
  const role = options.role ?? 'admin';
  const id = options.id ?? randomUUID();
  const username = options.username ?? `${role}-${id.slice(0, 8)}`;
  const password = options.password ?? DEFAULT_TEST_PASSWORD;
  const email = options.email ?? null;
  target.db
    .insert(users)
    .values({
      id,
      username,
      email,
      passwordHash: hashPassword(password),
      role,
      createdAt: options.createdAt ?? new Date(),
    })
    .run();
  return {
    id,
    username,
    email,
    role,
    password,
    credentials: { usernameOrEmail: username, password },
  };
}
