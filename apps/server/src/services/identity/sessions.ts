import { eq } from 'drizzle-orm';

import { type DsmDatabase, type Session, sessions } from '@aegis/database';

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
