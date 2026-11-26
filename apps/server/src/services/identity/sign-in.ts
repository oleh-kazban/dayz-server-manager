import { eq } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';

import type { SignInResponseDto, UserRole } from '@aegis/api-contracts';
import { type DsmDatabase, sessions, type User, users } from '@aegis/database';

import { setupExpiresAt } from './setup-account';

const DAY_MS = 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_SECONDS = 900;

export interface TokenPayload {
  sub: string;
  username?: string;
  role?: UserRole;
  type: 'access' | 'refresh';
  sid: string;
  jti?: string;
}

export interface SignInDeps {
  db: DsmDatabase;
  signToken: (payload: TokenPayload, expiresInSeconds: number) => string;
}

export interface SignInContext {
  rememberMe: boolean;
  ipAddress: string;
  userAgent: string | null;
  now: Date;
}

/** Client address and agent of a sign-in request. */
export function signInContext(request: FastifyRequest, rememberMe: boolean): SignInContext {
  const rawXForwardedFor = request.headers['x-forwarded-for'];
  let forwardedIp: string | undefined;
  if (Array.isArray(rawXForwardedFor)) {
    forwardedIp = rawXForwardedFor[0];
  } else if (typeof rawXForwardedFor === 'string') {
    forwardedIp = rawXForwardedFor.split(',')[0].trim();
  }
  return {
    rememberMe,
    ipAddress: forwardedIp || request.ip || '127.0.0.1',
    userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    now: new Date(),
  };
}

/** Creates the session row and the token pair. A setup session never outlives its account. */
export function issueSignIn(
  { db, signToken }: SignInDeps,
  user: User,
  ctx: SignInContext,
): SignInResponseDto {
  db.update(users).set({ lastLoginAt: ctx.now }).where(eq(users.id, user.id)).run();

  const sid = randomUUID();
  const jti = randomUUID();
  const rememberMe = user.role === 'setup' ? false : ctx.rememberMe;
  let expiresAt = new Date(ctx.now.getTime() + (rememberMe ? 30 : 7) * DAY_MS);
  if (user.role === 'setup') {
    const cap = setupExpiresAt(user.createdAt);
    if (cap < expiresAt) expiresAt = cap;
  }

  db.insert(sessions)
    .values({
      id: sid,
      userId: user.id,
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
      lastActiveAt: ctx.now,
      createdAt: ctx.now,
      expiresAt,
      refreshJti: jti,
    })
    .run();

  const accessToken = signToken(
    { sub: user.id, username: user.username, role: user.role, type: 'access', sid },
    ACCESS_TOKEN_SECONDS,
  );
  const refreshToken = signToken(
    { sub: user.id, type: 'refresh', sid, jti },
    Math.max(1, Math.floor((expiresAt.getTime() - ctx.now.getTime()) / 1000)),
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_SECONDS,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? undefined,
      email: user.email ?? undefined,
      role: user.role,
    },
  };
}
