import { eq } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase, sessions, users } from '@aegis/database';

import { insertUser } from '../../__fixtures__/users';

import { issueSignIn, type SignInContext, signInContext } from './sign-in';

const FORWARDED = '203.0.113.7';
const SECOND = '198.51.100.2';
const DIRECT = '192.0.2.9';

const fakeRequest = (headers: Record<string, unknown>, ip?: string) =>
  ({ headers, ip }) as unknown as FastifyRequest;

describe('signInContext client address (AC-11)', () => {
  it('uses request.ip', () => {
    expect(signInContext(fakeRequest({}, DIRECT), false).ipAddress).toBe(DIRECT);
  });

  it('never reads a string x-forwarded-for itself', () => {
    const ctx = signInContext(
      fakeRequest({ 'x-forwarded-for': `${FORWARDED}, ${SECOND}` }, DIRECT),
      false,
    );

    expect(ctx.ipAddress).toBe(DIRECT);
  });

  it('never reads an array x-forwarded-for itself', () => {
    const ctx = signInContext(
      fakeRequest({ 'x-forwarded-for': [FORWARDED, SECOND] }, DIRECT),
      false,
    );

    expect(ctx.ipAddress).toBe(DIRECT);
  });

  it('falls back to 127.0.0.1 without request.ip, even with a header', () => {
    expect(signInContext(fakeRequest({}), false).ipAddress).toBe('127.0.0.1');
    expect(signInContext(fakeRequest({ 'x-forwarded-for': FORWARDED }), false).ipAddress).toBe(
      '127.0.0.1',
    );
  });

  // eslint-disable-next-line sonarjs/no-hardcoded-ip -- address literals are test data
  it.each([DIRECT, '2001:db8::1', '::1', '::ffff:192.0.2.9'])(
    'passes the valid address %j through unchanged',
    ip => {
      expect(signInContext(fakeRequest({}, ip), false).ipAddress).toBe(ip);
    },
  );

  it.each(['<script>x</script>', 'not-an-ip', '1.2.3', '1.2.3.4, 5.6.7.8', 'a'.repeat(300)])(
    'stores unknown when request.ip is not an IP address (%#)',
    ip => {
      expect(signInContext(fakeRequest({}, ip), false).ipAddress).toBe('unknown');
    },
  );

  it('passes rememberMe and the user agent through', () => {
    const ctx = signInContext(fakeRequest({ 'user-agent': 'agent/1' }, DIRECT), true);

    expect(ctx.rememberMe).toBe(true);
    expect(ctx.userAgent).toBe('agent/1');
  });
});

describe('issueSignIn removes expired sessions (AC-13)', () => {
  const NOW = new Date('2026-11-27T10:00:00.000Z');
  let dbi: DatabaseInstance;
  let userId: string;

  const insertSession = (id: string, expiresAt: Date): void => {
    dbi.db
      .insert(sessions)
      .values({
        id,
        userId,
        lastActiveAt: NOW,
        createdAt: NOW,
        expiresAt,
        refreshJti: `jti-${id}`,
      })
      .run();
  };
  const ctx = (): SignInContext => ({
    rememberMe: false,
    ipAddress: DIRECT,
    userAgent: null,
    now: NOW,
  });
  const signIn = () => {
    const user = dbi.db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) throw new Error('user missing');
    return issueSignIn({ db: dbi.db, signToken: () => 'token' }, user, ctx());
  };
  const ids = () =>
    dbi.db
      .select()
      .from(sessions)
      .all()
      .map(row => row.id)
      .sort();

  beforeEach(() => {
    dbi = initDatabase({ dbPath: ':memory:' });
    userId = insertUser(dbi).id;
  });

  afterEach(() => {
    dbi.close();
  });

  it('deletes rows that expired before now and at now, keeps rows one second later', () => {
    insertSession('long-gone', new Date(NOW.getTime() - 86_400_000));
    insertSession('at-now', NOW);
    insertSession('one-second-left', new Date(NOW.getTime() + 1_000));

    signIn();

    expect(ids()).toHaveLength(2);
    expect(ids()).toContain('one-second-left');
    expect(ids()).not.toContain('long-gone');
    expect(ids()).not.toContain('at-now');
  });

  it('removes the expired rows of other users too', () => {
    const otherId = insertUser(dbi).id;
    dbi.db
      .insert(sessions)
      .values({
        id: 'other-expired',
        userId: otherId,
        lastActiveAt: NOW,
        createdAt: NOW,
        expiresAt: new Date(NOW.getTime() - 1_000),
        refreshJti: 'jti-other',
      })
      .run();

    signIn();

    expect(ids()).not.toContain('other-expired');
  });

  it('still creates the new session', () => {
    insertSession('expired', new Date(NOW.getTime() - 1_000));

    signIn();

    expect(ids()).toHaveLength(1);
    expect(ids()).not.toContain('expired');
  });
});
