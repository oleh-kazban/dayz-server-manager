import { and, eq, ne } from 'drizzle-orm';

import { type DsmDatabase, type Session, sessions } from '@aegis/database';

import type { SseHub } from '../realtime/sse-hub';

const TOUCH_INTERVAL_MS = 60_000;

/** The session when it exists and has not expired. Never writes. */
export function findLiveSession(
  db: DsmDatabase,
  sid: string,
  now: Date = new Date(),
): Session | undefined {
  const session = db.select().from(sessions).where(eq(sessions.id, sid)).get();
  return session && session.expiresAt.getTime() > now.getTime() ? session : undefined;
}

/** Records activity, at most once a minute (SQLite WAL write contention guard, ARCH-04). */
export function touchSession(db: DsmDatabase, session: Session, now: Date): void {
  if (now.getTime() - session.lastActiveAt.getTime() > TOUCH_INTERVAL_MS) {
    db.update(sessions).set({ lastActiveAt: now }).where(eq(sessions.id, session.id)).run();
  }
}

/**
 * Deletes one session, or every session of a user except `exceptSid`, then ends their event
 * streams. Rows go first so a stream cannot outlive its session. Returns the deleted ids.
 */
export function revokeSessions(
  { db, hub }: { db: DsmDatabase; hub: Pick<SseHub, 'closeSession'> },
  target: { sid: string } | { userId: string; exceptSid?: string },
): string[] {
  let where;
  if ('sid' in target) {
    where = eq(sessions.id, target.sid);
  } else if (target.exceptSid === undefined) {
    where = eq(sessions.userId, target.userId);
  } else {
    where = and(eq(sessions.userId, target.userId), ne(sessions.id, target.exceptSid));
  }
  const ids = db.delete(sessions).where(where).returning({ id: sessions.id }).all();
  return ids.map(({ id }) => {
    hub.closeSession(id);
    return id;
  });
}
