import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { realtimeTicketResponseSchema, serverLogTailSchema } from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase, servers } from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { FakeProcessManager } from '../services/server/__fixtures__/fake-process-manager';

const SERVER_ID = '55555555-5555-4555-a555-555555555555';
const RPT = 'DayZServer_x64_2026-11-17_10-00-00.RPT';

let installDir: string;
let profilesDir: string;
let db: DatabaseInstance;
let app: FastifyInstance;
let token: string;

beforeEach(async () => {
  installDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-logs-route-'));
  profilesDir = path.join(installDir, 'profiles');
  db = initDatabase({ dbPath: ':memory:' });
  const now = new Date();
  db.db
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
    db,
    processManager: new FakeProcessManager(),
  });
  await app.ready();
  token = app.jwt.sign({ sub: 'admin-id', role: 'admin', type: 'access' });
});

afterEach(async () => {
  await app.close();
  db.close();
  fs.rmSync(installDir, { recursive: true, force: true });
});

const writeRpt = (content: string, name = RPT) => {
  fs.mkdirSync(profilesDir, { recursive: true });
  const file = path.join(profilesDir, name);
  fs.writeFileSync(file, content);
  return file;
};
const getTail = (url = `/api/v1/servers/${SERVER_ID}/logs/rpt`, auth = true) =>
  app.inject({
    method: 'GET',
    url,
    headers: auth ? { authorization: `Bearer ${token}` } : {},
  });

describe('GET /servers/:id/logs/rpt (DSM-00206)', () => {
  it('returns the tail of the newest RPT with line numbers', async () => {
    writeRpt('older\n', 'DayZServer_x64_2026-11-16_10-00-00.RPT');
    fs.utimesSync(
      path.join(profilesDir, 'DayZServer_x64_2026-11-16_10-00-00.RPT'),
      new Date(1_000_000),
      new Date(1_000_000),
    );
    writeRpt('10:00:00 Starting\n10:00:01 Mission read\n10:00:02 part');

    const response = await getTail();

    expect(response.statusCode).toBe(200);
    const tail = serverLogTailSchema.parse(response.json());
    expect(tail).toMatchObject({
      kind: 'rpt',
      file: { name: RPT, size: 53 },
      lines: ['10:00:00 Starting', '10:00:01 Mission read'],
      offset: 40,
      truncated: false,
      firstLineNumber: 1,
      totalLines: 2,
      live: false,
    });
  });

  it('reports live for an active server and an empty tail without logs', async () => {
    db.db.update(servers).set({ status: 'running' }).where(eq(servers.id, SERVER_ID)).run();
    expect((await getTail()).json()).toEqual({
      kind: 'rpt',
      file: null,
      lines: [],
      offset: 0,
      truncated: false,
      firstLineNumber: 1,
      totalLines: 0,
      live: true,
    });
  });

  it('rejects an unknown kind, an unknown server, a bad profile path and no auth', async () => {
    expect((await getTail(`/api/v1/servers/${SERVER_ID}/logs/adm`)).statusCode).toBe(400);
    expect(
      (await getTail('/api/v1/servers/66666666-6666-4666-a666-666666666666/logs/rpt')).statusCode,
    ).toBe(404);
    expect((await getTail(undefined, false)).statusCode).toBe(401);

    db.db.update(servers).set({ profilePath: '../outside' }).where(eq(servers.id, SERVER_ID)).run();
    const escaped = await getTail();
    expect(escaped.statusCode).toBe(400);
    expect(escaped.json().errorCode).toBe('CONFIG_PATH_INVALID');
  });
});

describe('GET /servers/:id/logs/rpt/stream (DSM-00206)', () => {
  let base: string;

  beforeEach(async () => {
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address() as { port: number };
    base = `http://127.0.0.1:${address.port}/api/v1/servers/${SERVER_ID}/logs/rpt/stream`;
  });

  /** Reads SSE events until `until` is satisfied, then disconnects. */
  async function collect(
    url: string,
    init: RequestInit,
    act: () => void,
    until: (events: { event: string; data: { lines: string[]; offset: number } }[]) => boolean,
  ) {
    const controller = new AbortController();
    const response = await fetch(url, { ...init, signal: controller.signal });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    const events: { event: string; data: { lines: string[]; offset: number } }[] = [];
    const decoder = new TextDecoder();
    let buffer = '';
    act();
    const deadline = setTimeout(() => controller.abort(), 5_000);
    try {
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true });
        let index;
        while ((index = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          const event = /^event: (.+)$/m.exec(block)?.[1];
          const data = /^data: (.+)$/m.exec(block)?.[1];
          if (event && data) {
            events.push({ event, data: JSON.parse(data) });
          }
        }
        if (until(events)) {
          break;
        }
      }
    } catch {
      // aborted
    } finally {
      clearTimeout(deadline);
      controller.abort();
    }
    return events;
  }

  it('streams lines appended after the offset, authorised by a single-use ticket', async () => {
    const file = writeRpt('loaded\n');
    const issued = await app.inject({
      method: 'POST',
      url: '/api/v1/realtime/ticket',
      headers: { authorization: `Bearer ${token}` },
    });
    const { ticket } = realtimeTicketResponseSchema.parse(issued.json());

    const events = await collect(
      `${base}?ticket=${encodeURIComponent(ticket)}&file=${RPT}&from=7`,
      {},
      () => fs.appendFileSync(file, 'live 1\nlive 2\n'),
      received => received.flatMap(e => e.data.lines).length >= 2,
    );

    expect(events.map(e => e.event)).toEqual(['log.lines']);
    expect(events[0].data).toEqual({ file: RPT, lines: ['live 1', 'live 2'], offset: 21 });
  });

  it('waits for the first RPT when none exists yet (Authorization header)', async () => {
    const events = await collect(
      base,
      { headers: { authorization: `Bearer ${token}` } },
      () => setTimeout(() => writeRpt('first line\n'), 300),
      received => received.length >= 1,
    );
    expect(events[0].data).toMatchObject({ file: RPT, lines: ['first line'], offset: 11 });
  });

  it('validates the file name, the offset and that the file exists', async () => {
    writeRpt('x\n');
    const headers = { authorization: `Bearer ${token}` };
    const invalid = await fetch(`${base}?file=${encodeURIComponent('../x.RPT')}`, { headers });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).errorCode).toBe('SERVER_LOG_FILE_INVALID');

    const missing = await fetch(`${base}?file=gone.RPT`, { headers });
    expect(missing.status).toBe(404);
    expect((await missing.json()).errorCode).toBe('SERVER_LOG_NOT_FOUND');

    const badOffset = await fetch(`${base}?from=-1`, { headers });
    expect(badOffset.status).toBe(400);
    expect((await badOffset.json()).errorCode).toBe('VALIDATION_FAILED');

    const unknownKind = await fetch(base.replace('/logs/rpt/', '/logs/adm/'), { headers });
    expect(unknownKind.status).toBe(400);

    const noTicket = await fetch(`${base}?ticket=nope`);
    expect(noTicket.status).toBe(401);
    expect((await noTicket.json()).errorCode).toBe('AUTH_SSE_TICKET_INVALID');
  });

  it('reports a missing file even before the profiles directory exists', async () => {
    const missing = await fetch(`${base}?file=gone.RPT`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(missing.status).toBe(404);
  });
});
