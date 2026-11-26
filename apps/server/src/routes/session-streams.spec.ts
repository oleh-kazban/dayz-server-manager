import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase, sessions, users } from '@aegis/database';

import { type SignedSession, signSession } from '../__fixtures__/session-token';
import { DEFAULT_TEST_PASSWORD } from '../__fixtures__/users';
import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

type Reader = ReadableStreamDefaultReader<Uint8Array>;

describe('Open event streams follow the session (AC-9, AC-10)', () => {
  let app: FastifyInstance;
  let dbi: DatabaseInstance;
  let baseUrl: string;
  let readers: Reader[];

  beforeAll(async () => {
    dbi = initDatabase({ dbPath: ':memory:' });
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      }),
      db: dbi,
    });
    baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
  });

  afterAll(async () => {
    await app.close();
    dbi.close();
  });

  beforeEach(() => {
    readers = [];
  });

  afterEach(async () => {
    await Promise.all(readers.map(r => r.cancel().catch(() => undefined)));
  });

  const session = (userId?: string): SignedSession => signSession(app, { sub: userId });

  /** Opens a stream with the session's access token and waits for the connected comment. */
  const openStream = async (signed: SignedSession): Promise<Reader> => {
    const res = await fetch(`${baseUrl}/api/v1/realtime/sse`, {
      headers: { authorization: `Bearer ${signed.accessToken}` },
    });
    expect(res.status).toBe(200);
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    readers.push(reader);
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain(': connected');
    return reader;
  };

  /**
   * One broadcast probe, then one read per stream: an open stream yields the probe, a closed
   * stream ends. Deterministic, no timers.
   */
  const openFlags = async (streams: Reader[]): Promise<boolean[]> => {
    app.sseHub.broadcast('probe', {});
    return Promise.all(streams.map(async s => !(await s.read()).done));
  };

  const post = (url: string, token: string, payload?: unknown) =>
    app.inject({
      method: 'POST',
      url,
      headers: { authorization: `Bearer ${token}` },
      payload: payload as object | undefined,
    });

  it('closes the streams of a session after sign-out and keeps another session of the user', async () => {
    const a = session();
    const b = session(a.userId);
    const [streamA, streamB] = [await openStream(a), await openStream(b)];

    const res = await post('/api/v1/auth/logout', a.accessToken);

    expect(res.statusCode).toBe(204);
    expect(await openFlags([streamA, streamB])).toEqual([false, true]);
  });

  it('closes the streams of a revoked session and keeps the others', async () => {
    const caller = session();
    const target = session(caller.userId);
    const [streamCaller, streamTarget] = [await openStream(caller), await openStream(target)];

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/auth/sessions/${target.sid}`,
      headers: { authorization: `Bearer ${caller.accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(await openFlags([streamCaller, streamTarget])).toEqual([true, false]);
  });

  it('closes the streams of every other session on revoke-others and keeps the current one', async () => {
    const current = session();
    const other1 = session(current.userId);
    const other2 = session(current.userId);
    const foreign = session();
    const streams = [
      await openStream(current),
      await openStream(other1),
      await openStream(other2),
      await openStream(foreign),
    ];

    const res = await post('/api/v1/auth/sessions/revoke-others', current.accessToken);

    expect(res.statusCode).toBe(200);
    expect(await openFlags(streams)).toEqual([true, false, false, true]);
  });

  it('closes the streams of the other sessions after a password change and keeps the current one', async () => {
    const current = session();
    const other = session(current.userId);
    const [streamCurrent, streamOther] = [await openStream(current), await openStream(other)];

    const res = await post('/api/v1/profile/change-password', current.accessToken, {
      currentPassword: DEFAULT_TEST_PASSWORD,
      newPassword: 'newSuperPassword1!',
      confirmPassword: 'newSuperPassword1!',
    });

    expect(res.statusCode).toBe(200);
    expect(await openFlags([streamCurrent, streamOther])).toEqual([true, false]);
  });

  it('closes the streams of a session whose refresh token is reused and keeps other sessions', async () => {
    const victim = session();
    const bystander = session(victim.userId);
    const [streamVictim, streamBystander] = [await openStream(victim), await openStream(bystander)];
    const forged = app.jwt.sign({
      sub: victim.userId,
      type: 'refresh',
      sid: victim.sid,
      jti: 'never-issued',
    } as never);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: forged },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().errorCode).toBe('AUTH_SESSION_EXPIRED');
    expect(await openFlags([streamVictim, streamBystander])).toEqual([false, true]);
  });

  it('closes the streams of a session that expired, at the next heartbeat', async () => {
    const expiring = session();
    const live = session();
    const [streamExpiring, streamLive] = [await openStream(expiring), await openStream(live)];
    dbi.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(sessions.id, expiring.sid))
      .run();

    app.sseHub.heartbeat();

    expect(await openFlags([streamExpiring, streamLive])).toEqual([false, true]);
  });

  it('closes the streams of a session whose row is gone, at the next heartbeat', async () => {
    const gone = session();
    const stream = await openStream(gone);
    dbi.db.delete(sessions).where(eq(sessions.id, gone.sid)).run();

    app.sseHub.heartbeat();

    expect(await openFlags([stream])).toEqual([false]);
  });

  it('closes the streams of a session removed by deleting its user, at the next heartbeat', async () => {
    const orphaned = session();
    const bystander = session();
    const [streamOrphaned, streamBystander] = [
      await openStream(orphaned),
      await openStream(bystander),
    ];
    dbi.db.delete(users).where(eq(users.id, orphaned.userId)).run();

    app.sseHub.heartbeat();

    expect(await openFlags([streamOrphaned, streamBystander])).toEqual([false, true]);
  });

  it('does not change last_active_at when the heartbeat checks a session (AC-10)', async () => {
    const live = session();
    await openStream(live);
    const stale = new Date(Math.floor((Date.now() - 24 * 3_600_000) / 1000) * 1000);
    dbi.db.update(sessions).set({ lastActiveAt: stale }).where(eq(sessions.id, live.sid)).run();

    app.sseHub.heartbeat();

    const row = dbi.db.select().from(sessions).where(eq(sessions.id, live.sid)).get();
    expect(row?.lastActiveAt.getTime()).toBe(stale.getTime());
  });

  it('keeps a live session open through the heartbeat', async () => {
    const live = session();
    const stream = await openStream(live);

    app.sseHub.heartbeat();

    expect(await openFlags([stream])).toEqual([true]);
  });
});
