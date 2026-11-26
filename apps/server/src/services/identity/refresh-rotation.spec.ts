import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase, sessions } from '@aegis/database';

import { insertUser } from '../../__fixtures__/users';

import { rotateRefreshToken } from './refresh-rotation';

const SID = 'sid-under-test';
const OTHER_SID = 'sid-other';
const T0 = new Date('2026-11-27T10:00:00.000Z');
const WINDOW_MS = 60_000;

describe('rotateRefreshToken (AC-4, AC-5, AC-6)', () => {
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
        expiresAt: new Date(T0.getTime() + 7 * 24 * 3_600_000),
        refreshJti: 'J1',
        ...values,
      })
      .run();
  };
  const row = (id = SID) => dbi.db.select().from(sessions).where(eq(sessions.id, id)).get();
  const rotate = (jti: string, now: Date, newJti = 'J-new') =>
    rotateRefreshToken(dbi.sqlite, dbi.db, { sid: SID, jti, now, newJti });
  const at = (ms: number) => new Date(T0.getTime() + ms);

  beforeEach(() => {
    dbi = initDatabase({ dbPath: ':memory:' });
    userId = insertUser(dbi).id;
  });

  afterEach(() => {
    dbi.close();
  });

  describe('current token', () => {
    it('rotates and reports the new identifier', () => {
      insertSession(SID);

      const result = rotate('J1', at(1_000), 'J2');

      expect(result).toMatchObject({ kind: 'rotated', jti: 'J2' });
    });

    it('stores the new identifier, keeps the old one as previous and records the time', () => {
      insertSession(SID);

      rotate('J1', at(1_000), 'J2');

      const stored = row();
      expect(stored?.refreshJti).toBe('J2');
      expect(stored?.previousRefreshJti).toBe('J1');
      expect(stored?.refreshRotatedAt?.getTime()).toBe(at(1_000).getTime());
      expect(stored?.lastActiveAt.getTime()).toBe(at(1_000).getTime());
    });

    it('returns the session it rotated', () => {
      insertSession(SID);

      const result = rotate('J1', at(1_000), 'J2');

      expect(result.kind === 'rotated' && result.session.id).toBe(SID);
    });

    it('rotates again with the new token and keeps only the immediately preceding identifier', () => {
      insertSession(SID);
      rotate('J1', at(1_000), 'J2');

      const second = rotate('J2', at(2_000), 'J3');

      expect(second).toMatchObject({ kind: 'rotated', jti: 'J3' });
      expect(row()?.refreshJti).toBe('J3');
      expect(row()?.previousRefreshJti).toBe('J2');
    });

    it('does not extend the session expiry', () => {
      insertSession(SID);
      const before = row()?.expiresAt.getTime();

      rotate('J1', at(1_000), 'J2');

      expect(row()?.expiresAt.getTime()).toBe(before);
    });
  });

  describe('previous token inside the 60 second window', () => {
    beforeEach(() => {
      insertSession(SID);
      rotate('J1', T0, 'J2');
    });

    it('is answered with the current identifier, not a new one', () => {
      const result = rotate('J1', at(WINDOW_MS - 1), 'J-should-not-be-used');

      expect(result).toMatchObject({ kind: 'rotated', jti: 'J2' });
    });

    it('still answers with the current identifier at exactly 60 seconds', () => {
      const result = rotate('J1', at(WINDOW_MS), 'J-should-not-be-used');

      expect(result).toMatchObject({ kind: 'rotated', jti: 'J2' });
      expect(row()?.refreshJti).toBe('J2');
    });

    it('changes no state', () => {
      const before = row();

      rotate('J1', at(WINDOW_MS - 1), 'J-should-not-be-used');

      expect(row()).toEqual(before);
    });

    it('answers every repeat of the previous token the same way', () => {
      const first = rotate('J1', at(10_000), 'x1');
      const second = rotate('J1', at(20_000), 'x2');
      const third = rotate('J1', at(30_000), 'x3');

      for (const result of [first, second, third]) {
        expect(result).toMatchObject({ kind: 'rotated', jti: 'J2' });
      }
      expect(row()?.refreshJti).toBe('J2');
    });

    it('still accepts the current token and rotates it', () => {
      const result = rotate('J2', at(5_000), 'J3');

      expect(result).toMatchObject({ kind: 'rotated', jti: 'J3' });
      expect(row()?.previousRefreshJti).toBe('J2');
    });
  });

  describe('reuse', () => {
    it('deletes the session when the previous token comes back after the window', () => {
      insertSession(SID);
      rotate('J1', T0, 'J2');

      const result = rotate('J1', at(WINDOW_MS + 1), 'J-x');

      expect(result).toEqual({ kind: 'reuse' });
      expect(row()).toBeUndefined();
    });

    it('deletes the session for an identifier that was never issued', () => {
      insertSession(SID);

      const result = rotate('never-issued', at(1_000));

      expect(result).toEqual({ kind: 'reuse' });
      expect(row()).toBeUndefined();
    });

    it('treats a token two rotations back as reuse even inside the window', () => {
      insertSession(SID);
      rotate('J1', T0, 'J2');
      rotate('J2', at(1_000), 'J3');

      const result = rotate('J1', at(2_000), 'J-x');

      expect(result).toEqual({ kind: 'reuse' });
      expect(row()).toBeUndefined();
    });

    it('treats a row without a stored identifier as reuse', () => {
      insertSession(SID, { refreshJti: null });

      const result = rotate('J1', at(1_000));

      expect(result).toEqual({ kind: 'reuse' });
      expect(row()).toBeUndefined();
    });

    it('leaves the sessions of other devices untouched', () => {
      insertSession(SID);
      insertSession(OTHER_SID, { refreshJti: 'K1' });

      rotate('never-issued', at(1_000));

      expect(row(OTHER_SID)?.refreshJti).toBe('K1');
    });
  });

  describe('gone session', () => {
    it('reports gone for an unknown session id', () => {
      const result = rotateRefreshToken(dbi.sqlite, dbi.db, {
        sid: 'no-such-sid',
        jti: 'J1',
        now: T0,
        newJti: 'J2',
      });

      expect(result).toEqual({ kind: 'gone' });
    });

    it('reports gone for an expired session and rotates nothing', () => {
      insertSession(SID, { expiresAt: at(-1) });

      const result = rotate('J1', T0, 'J2');

      expect(result).toEqual({ kind: 'gone' });
      expect(row()?.refreshJti).toBe('J1');
    });

    it('reports gone when the session expires exactly now', () => {
      insertSession(SID, { expiresAt: T0 });

      expect(rotate('J1', T0, 'J2')).toEqual({ kind: 'gone' });
    });

    it('accepts a session that expires one second after now', () => {
      insertSession(SID, { expiresAt: at(1_000) });

      expect(rotate('J1', T0, 'J2')).toMatchObject({ kind: 'rotated', jti: 'J2' });
    });
  });
});
