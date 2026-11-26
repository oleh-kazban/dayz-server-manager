import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

import type { UserRole } from '@aegis/api-contracts';
import { type DsmDatabase, sessions, users } from '@aegis/database';

import { insertUser } from './users';

export interface SignSessionOptions {
  /** User id; defaults to a fresh UUID. The user row is inserted when it does not exist. */
  sub?: string;
  role?: UserRole;
  /** Role claim of the access token when it must differ from the user row; null omits the claim. */
  tokenRole?: string | null;
  username?: string;
  /** Session and refresh token lifetime; defaults to 7 days. */
  ttlMs?: number;
  /** Insert only the session row, for tests of a token whose user was deleted. */
  withoutUser?: boolean;
}

export interface SignedSession {
  accessToken: string;
  refreshToken: string;
  sid: string;
  userId: string;
  jti: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Inserts a live session row and signs the access and refresh token the way `issueSignIn` does
 * (access: `sid`; refresh: `sid` and `jti`). Test-only.
 */
export function signSession(
  target: { db: DsmDatabase; jwt: FastifyInstance['jwt'] },
  options: SignSessionOptions = {},
): SignedSession {
  const { db, jwt } = target;
  const userId = options.sub ?? randomUUID();
  const role = options.role ?? 'admin';
  const username = options.username ?? `${role}-${userId.slice(0, 8)}`;
  const sid = randomUUID();
  const jti = randomUUID();
  const now = new Date();
  const ttlMs = options.ttlMs ?? 7 * DAY_MS;

  if (!options.withoutUser && !db.select().from(users).where(eq(users.id, userId)).get()) {
    insertUser({ db }, { id: userId, role, username });
  }

  const insertSession = () =>
    db
      .insert(sessions)
      .values({
        id: sid,
        userId,
        lastActiveAt: now,
        createdAt: now,
        expiresAt: new Date(now.getTime() + ttlMs),
        refreshJti: jti,
      })
      .run();
  if (options.withoutUser) {
    db.run(sql`PRAGMA foreign_keys = OFF`);
    try {
      insertSession();
    } finally {
      db.run(sql`PRAGMA foreign_keys = ON`);
    }
  } else {
    insertSession();
  }

  // Plain variables, so the claim shape is not tied to the FastifyJWT typing.
  const tokenRole = options.tokenRole === undefined ? role : options.tokenRole;
  const accessClaims = {
    sub: userId,
    username,
    ...(tokenRole === null ? {} : { role: tokenRole }),
    type: 'access',
    sid,
  };
  const refreshClaims = { sub: userId, type: 'refresh', sid, jti };
  return {
    accessToken: jwt.sign(accessClaims as never, { expiresIn: '15m' }),
    refreshToken: jwt.sign(refreshClaims as never, {
      expiresIn: Math.max(1, Math.floor(ttlMs / 1000)),
    }),
    sid,
    userId,
    jti,
  };
}
