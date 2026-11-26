import { eq } from 'drizzle-orm';

import { type DatabaseInstance, type Session, sessions } from '@aegis/database';

/** How long the previous refresh token is still answered after a rotation (several tabs). */
const GRACE_MS = 60_000;

export type RotationResult =
  { kind: 'rotated'; session: Session; jti: string } | { kind: 'gone' } | { kind: 'reuse' };

export interface RotationInput {
  sid: string;
  jti: string;
  now: Date;
  newJti: string;
}

/**
 * Checks a refresh token identifier against the session and rotates it, in one transaction.
 * The previous identifier is answered with the current one inside the grace window and changes
 * nothing; any other unknown identifier is reuse and deletes the session.
 */
export function rotateRefreshToken(
  sqlite: DatabaseInstance['sqlite'],
  db: DatabaseInstance['db'],
  { sid, jti, now, newJti }: RotationInput,
): RotationResult {
  return sqlite
    .transaction((): RotationResult => {
      const session = db.select().from(sessions).where(eq(sessions.id, sid)).get();
      if (!session || session.expiresAt.getTime() <= now.getTime()) return { kind: 'gone' };

      if (session.refreshJti !== null && jti === session.refreshJti) {
        const rotated = {
          previousRefreshJti: session.refreshJti,
          refreshJti: newJti,
          refreshRotatedAt: now,
          lastActiveAt: now,
        };
        db.update(sessions).set(rotated).where(eq(sessions.id, sid)).run();
        return { kind: 'rotated', session: { ...session, ...rotated }, jti: newJti };
      }

      if (
        session.refreshJti !== null &&
        session.previousRefreshJti !== null &&
        jti === session.previousRefreshJti &&
        session.refreshRotatedAt !== null &&
        now.getTime() - session.refreshRotatedAt.getTime() <= GRACE_MS
      ) {
        return { kind: 'rotated', session, jti: session.refreshJti };
      }

      db.delete(sessions).where(eq(sessions.id, sid)).run();
      return { kind: 'reuse' };
    })
    .immediate();
}
