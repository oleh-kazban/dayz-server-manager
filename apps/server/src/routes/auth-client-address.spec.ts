/* eslint-disable sonarjs/no-hardcoded-ip -- address literals are test data */
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase, sessions } from '@aegis/database';

import { type InsertedUser, insertUser } from '../__fixtures__/users';
import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

const PEER = '192.0.2.9';
const CLIENT = '203.0.113.195';
const OTHER_CLIENT = '198.51.100.10';
const SPOOF = '6.6.6.6';

describe('client address of a session (AC-11, AC-13)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let user: InsertedUser;

  const start = async (extraEnv: Record<string, string> = {}) => {
    dbInstance = initDatabase({ dbPath: ':memory:' });
    user = insertUser(dbInstance, { username: 'operator' });
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
        ...extraEnv,
      }),
      db: dbInstance,
    });
    await app.ready();
  };

  const login = (
    options: { remoteAddress?: string; forwardedFor?: string | string[]; password?: string } = {},
  ) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: options.remoteAddress,
      headers:
        options.forwardedFor === undefined ? {} : { 'x-forwarded-for': options.forwardedFor },
      payload: { ...user.credentials, password: options.password ?? user.password },
    });

  const storedIp = (accessToken: string) => {
    const sid = app.jwt.decode<{ sid: string }>(accessToken)?.sid ?? '';
    return dbInstance.db.select().from(sessions).where(eq(sessions.id, sid)).get()?.ipAddress;
  };

  afterEach(async () => {
    await app.close();
    dbInstance.close();
  });

  describe('without TRUST_PROXY', () => {
    it('stores the socket address and ignores an x-forwarded-for string', async () => {
      await start();

      const res = await login({ remoteAddress: PEER, forwardedFor: `${SPOOF}, ${CLIENT}` });

      expect(res.statusCode).toBe(200);
      expect(storedIp(res.json().accessToken)).toBe(PEER);
    });

    it('stores the socket address and ignores an x-forwarded-for array', async () => {
      await start();

      const res = await login({
        remoteAddress: PEER,
        forwardedFor: [SPOOF, CLIENT] as unknown as string,
      });

      expect(storedIp(res.json().accessToken)).toBe(PEER);
    });

    it('stores the socket address when the header is absent', async () => {
      await start();

      const res = await login({ remoteAddress: PEER });

      expect(storedIp(res.json().accessToken)).toBe(PEER);
    });

    it('treats an empty TRUST_PROXY as off', async () => {
      await start({ TRUST_PROXY: '' });

      const res = await login({ remoteAddress: PEER, forwardedFor: CLIENT });

      expect(storedIp(res.json().accessToken)).toBe(PEER);
    });

    it('does not let a spoofed x-forwarded-for change the sign-in rate-limit bucket', async () => {
      await start();
      for (let i = 0; i < 10; i++) {
        await login({ remoteAddress: PEER, forwardedFor: `10.0.0.${i}`, password: 'wrong-pass' });
      }

      const res = await login({ remoteAddress: PEER, forwardedFor: '10.9.9.9' });

      expect(res.statusCode).toBe(429);
    });
  });

  describe('with TRUST_PROXY set to the proxy address', () => {
    it('stores the forwarded client address', async () => {
      await start({ TRUST_PROXY: PEER });

      const res = await login({ remoteAddress: PEER, forwardedFor: CLIENT });

      expect(storedIp(res.json().accessToken)).toBe(CLIENT);
    });

    it('ignores entries a client prepended to the header', async () => {
      await start({ TRUST_PROXY: PEER });

      const res = await login({ remoteAddress: PEER, forwardedFor: `${SPOOF}, ${CLIENT}` });

      expect(storedIp(res.json().accessToken)).toBe(CLIENT);
    });

    it('trusts a CIDR range that contains the peer', async () => {
      await start({ TRUST_PROXY: '192.0.2.0/24' });

      const res = await login({ remoteAddress: PEER, forwardedFor: CLIENT });

      expect(storedIp(res.json().accessToken)).toBe(CLIENT);
    });

    it('keeps the socket address when the peer is not a trusted proxy', async () => {
      await start({ TRUST_PROXY: PEER });

      const res = await login({ remoteAddress: '198.51.100.77', forwardedFor: CLIENT });

      expect(storedIp(res.json().accessToken)).toBe('198.51.100.77');
    });

    it('keeps the socket address when the header is absent', async () => {
      await start({ TRUST_PROXY: PEER });

      const res = await login({ remoteAddress: PEER });

      expect(storedIp(res.json().accessToken)).toBe(PEER);
    });

    it('stores unknown when TRUST_PROXY is true and the forwarded value is not an IP address', async () => {
      await start({ TRUST_PROXY: 'true' });

      const res = await login({ remoteAddress: PEER, forwardedFor: 'not-an-ip' });

      expect(res.statusCode).toBe(200);
      expect(storedIp(res.json().accessToken)).toBe('unknown');
    });

    it('gives each forwarded client its own sign-in rate-limit bucket', async () => {
      await start({ TRUST_PROXY: PEER });
      for (let i = 0; i < 10; i++) {
        await login({ remoteAddress: PEER, forwardedFor: CLIENT, password: 'wrong-pass' });
      }

      const blocked = await login({ remoteAddress: PEER, forwardedFor: CLIENT });
      const other = await login({ remoteAddress: PEER, forwardedFor: OTHER_CLIENT });

      expect(blocked.statusCode).toBe(429);
      expect(other.statusCode).toBe(200);
    });
  });

  describe('expired sessions at sign-in (AC-13)', () => {
    it('removes expired session rows and keeps live ones when a sign-in creates a session', async () => {
      await start();
      const past = new Date('2020-01-01T00:00:00.000Z');
      const future = new Date(Date.now() + 3_600_000);
      const insert = (id: string, expiresAt: Date) =>
        dbInstance.db
          .insert(sessions)
          .values({
            id,
            userId: user.id,
            lastActiveAt: past,
            createdAt: past,
            expiresAt,
            refreshJti: `jti-${id}`,
          })
          .run();
      insert('expired-1', past);
      insert('expired-2', new Date(past.getTime() + 1_000));
      insert('live', future);

      const res = await login();

      const ids = dbInstance.db
        .select()
        .from(sessions)
        .all()
        .map(row => row.id);
      const newSid = app.jwt.decode<{ sid: string }>(res.json().accessToken)?.sid;
      expect(res.statusCode).toBe(200);
      expect([...ids].sort()).toEqual(['live', newSid].sort());
    });
  });
});
