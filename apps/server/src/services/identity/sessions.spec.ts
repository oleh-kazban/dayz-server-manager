import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type DatabaseInstance, initDatabase, sessions } from '@aegis/database';

import { insertUser } from '../../__fixtures__/users';

import { findLiveSession, revokeSessions } from './sessions';

const T0 = new Date('2026-11-27T10:00:00.000Z');
const HOUR_MS = 3_600_000;

describe('findLiveSession (AC-9, AC-10)', () => {
  let dbi: DatabaseInstance;
  let userId: string;

  const insertSession = (id: string, values: Partial<typeof sessions.$inferInsert> = {}): void => {
    dbi.db
      .insert(sessions)
      .values({
        id,
        userId,
        lastActiveAt: T0,
        createdAt: T0,
        expiresAt: new Date(T0.getTime() + HOUR_MS),
        refreshJti: 'J1',
        ...values,
      })
      .run();
  };

  beforeEach(() => {
    dbi = initDatabase({ dbPath: ':memory:' });
    userId = insertUser(dbi).id;
  });

  afterEach(() => {
    dbi.close();
  });

  it('returns a live session and leaves last_active_at untouched, however old it is', () => {
    const stale = new Date(T0.getTime() - 24 * HOUR_MS);
    insertSession('s1', { lastActiveAt: stale });

    const found = findLiveSession(dbi.db, 's1', T0);

    expect(found?.id).toBe('s1');
    const stored = dbi.db.select().from(sessions).where(eq(sessions.id, 's1')).get();
    expect(stored?.lastActiveAt.getTime()).toBe(stale.getTime());
  });

  it('returns undefined for a missing session', () => {
    expect(findLiveSession(dbi.db, 'nope', T0)).toBeUndefined();
  });

  it('returns undefined at the exact expiry and for an expired session', () => {
    insertSession('at-expiry', { expiresAt: T0 });
    insertSession('expired', { expiresAt: new Date(T0.getTime() - 1_000) });

    expect(findLiveSession(dbi.db, 'at-expiry', T0)).toBeUndefined();
    expect(findLiveSession(dbi.db, 'expired', T0)).toBeUndefined();
  });

  it('returns the session one second before expiry', () => {
    insertSession('s1', { expiresAt: new Date(T0.getTime() + 1_000) });

    expect(findLiveSession(dbi.db, 's1', T0)?.id).toBe('s1');
  });
});

describe('revokeSessions (AC-9)', () => {
  let dbi: DatabaseInstance;
  let userId: string;
  let otherUserId: string;
  let hub: { closeSession: ReturnType<typeof vi.fn> };

  const insertSession = (id: string, owner: string): void => {
    dbi.db
      .insert(sessions)
      .values({
        id,
        userId: owner,
        lastActiveAt: T0,
        createdAt: T0,
        expiresAt: new Date(T0.getTime() + HOUR_MS),
        refreshJti: `jti-${id}`,
      })
      .run();
  };
  const remaining = () =>
    dbi.db
      .select()
      .from(sessions)
      .all()
      .map(s => s.id)
      .sort();
  const revoke = (where: Parameters<typeof revokeSessions>[1]) =>
    revokeSessions({ db: dbi.db, hub }, where);

  beforeEach(() => {
    dbi = initDatabase({ dbPath: ':memory:' });
    userId = insertUser(dbi).id;
    otherUserId = insertUser(dbi).id;
    hub = { closeSession: vi.fn() };
    insertSession('a', userId);
    insertSession('b', userId);
    insertSession('c', userId);
    insertSession('x', otherUserId);
  });

  afterEach(() => {
    dbi.close();
  });

  it('deletes one session by id, closes its streams and returns the id', () => {
    const ids = revoke({ sid: 'a' });

    expect(ids).toEqual(['a']);
    expect(remaining()).toEqual(['b', 'c', 'x']);
    expect(hub.closeSession).toHaveBeenCalledTimes(1);
    expect(hub.closeSession).toHaveBeenCalledWith('a');
  });

  it('deletes every session of a user and closes each', () => {
    const ids = revoke({ userId });

    expect([...ids].sort()).toEqual(['a', 'b', 'c']);
    expect(remaining()).toEqual(['x']);
    expect(hub.closeSession.mock.calls.map(c => c[0]).sort()).toEqual(['a', 'b', 'c']);
  });

  it('keeps the excepted session and its streams', () => {
    const ids = revoke({ userId, exceptSid: 'b' });

    expect([...ids].sort()).toEqual(['a', 'c']);
    expect(remaining()).toEqual(['b', 'x']);
    expect(hub.closeSession).not.toHaveBeenCalledWith('b');
    expect(hub.closeSession).toHaveBeenCalledTimes(2);
  });

  it('never touches the sessions of another user', () => {
    revoke({ userId });

    expect(hub.closeSession).not.toHaveBeenCalledWith('x');
    expect(remaining()).toContain('x');
  });

  it('returns no ids and closes nothing when no row matches', () => {
    expect(revoke({ sid: 'unknown' })).toEqual([]);
    expect(revoke({ userId: 'unknown-user' })).toEqual([]);
    expect(hub.closeSession).not.toHaveBeenCalled();
    expect(remaining()).toHaveLength(4);
  });

  it('deletes the rows before it tells the hub', () => {
    let rowsWhenClosed: string[] = [];
    hub.closeSession.mockImplementation(() => {
      rowsWhenClosed = remaining();
    });

    revoke({ sid: 'a' });

    expect(rowsWhenClosed).not.toContain('a');
  });
});
