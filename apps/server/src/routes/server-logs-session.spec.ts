import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase, servers, sessions } from '@aegis/database';

import { type SignedSession, signSession } from '../__fixtures__/session-token';
import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { FakeProcessManager } from '../services/server/__fixtures__/fake-process-manager';

const SERVER_ID = '55555555-5555-4555-a555-555555555555';
const RPT = 'DayZServer_x64_2026-11-17_10-00-00.RPT';

type Reader = ReadableStreamDefaultReader<Uint8Array>;

describe('Open log streams follow the session (AC-9, R-SSE-2, R-SSE-3)', () => {
  let installDir: string;
  let rptFile: string;
  let dbi: DatabaseInstance;
  let app: FastifyInstance;
  let base: string;
  let readers: Reader[];
  let lineNo: number;

  beforeEach(async () => {
    installDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-logs-session-'));
    const profilesDir = path.join(installDir, 'profiles');
    fs.mkdirSync(profilesDir, { recursive: true });
    rptFile = path.join(profilesDir, RPT);
    fs.writeFileSync(rptFile, 'loaded\n');
    dbi = initDatabase({ dbPath: ':memory:' });
    const now = new Date();
    dbi.db
      .insert(servers)
      .values({
        id: SERVER_ID,
        name: 'Logs Target',
        installPath: installDir,
        profilePath: 'profiles',
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        createdAt: now,
        updatedAt: now,
      })
      .run();
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      }),
      db: dbi,
      processManager: new FakeProcessManager(),
    });
    const origin = await app.listen({ host: '127.0.0.1', port: 0 });
    base = `${origin}/api/v1/servers/${SERVER_ID}/logs/rpt/stream?file=${RPT}&from=7`;
    readers = [];
    lineNo = 0;
  });

  afterEach(async () => {
    await Promise.all(readers.map(r => r.cancel().catch(() => undefined)));
    await app.close();
    dbi.close();
    fs.rmSync(installDir, { recursive: true, force: true });
  });

  const session = (userId?: string): SignedSession => signSession(app, { sub: userId });

  /** Opens a log stream with the session's access token and waits for the connected comment. */
  const openLogStream = async (signed: SignedSession): Promise<Reader> => {
    const res = await fetch(base, { headers: { authorization: `Bearer ${signed.accessToken}` } });
    expect(res.status).toBe(200);
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    readers.push(reader);
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain(': connected');
    return reader;
  };

  /**
   * Appends one log line, then reads once per stream: an open stream delivers the line, a closed
   * stream ends. Waits on the stream, never on a timer.
   */
  const openFlags = async (streams: Reader[]): Promise<boolean[]> => {
    lineNo += 1;
    fs.appendFileSync(rptFile, `probe ${lineNo}\n`);
    return Promise.all(streams.map(async s => !(await s.read()).done));
  };

  it('closes the log stream of a signed-out session and keeps another session', async () => {
    const a = session();
    const b = session(a.userId);
    const [streamA, streamB] = [await openLogStream(a), await openLogStream(b)];

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${a.accessToken}` },
    });

    expect(res.statusCode).toBe(204);
    expect(await openFlags([streamA, streamB])).toEqual([false, true]);
  });

  it('closes the log stream of a session revoked from another session and keeps the caller', async () => {
    const caller = session();
    const target = session(caller.userId);
    const [streamCaller, streamTarget] = [await openLogStream(caller), await openLogStream(target)];

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/auth/sessions/${target.sid}`,
      headers: { authorization: `Bearer ${caller.accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(await openFlags([streamCaller, streamTarget])).toEqual([true, false]);
  });

  it('closes the log stream of a session whose row disappeared, at the next heartbeat', async () => {
    const gone = session();
    const live = session();
    const [streamGone, streamLive] = [await openLogStream(gone), await openLogStream(live)];
    dbi.db.delete(sessions).where(eq(sessions.id, gone.sid)).run();

    app.sseHub.heartbeat();

    expect(await openFlags([streamGone, streamLive])).toEqual([false, true]);
  });
});
