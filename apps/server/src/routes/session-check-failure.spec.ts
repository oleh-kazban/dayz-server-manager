import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type DatabaseInstance, initDatabase } from '@aegis/database';

import { signSession } from '../__fixtures__/session-token';
import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

const MESSAGE = 'Session check failed; streams closed';

describe('A failing session check at the heartbeat (R-SSE-3, fail closed)', () => {
  let app: FastifyInstance;
  let dbi: DatabaseInstance;
  let baseUrl: string;
  let lines: string[];
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  beforeEach(async () => {
    lines = [];
    dbi = initDatabase({ dbPath: ':memory:' });
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'info',
      }),
      db: dbi,
      logStream: { write: line => lines.push(line) },
    });
    baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
  });

  afterEach(async () => {
    await reader?.cancel().catch(() => undefined);
    vi.restoreAllMocks();
    await app.close();
    dbi.close();
  });

  it('closes the stream and logs the error with the session id and no token', async () => {
    const signed = signSession(app);
    const res = await fetch(`${baseUrl}/api/v1/realtime/sse`, {
      headers: { authorization: `Bearer ${signed.accessToken}` },
    });
    reader = (res.body as ReadableStream<Uint8Array>).getReader();
    await reader.read();
    vi.spyOn(dbi.db, 'select').mockImplementation(() => {
      throw new Error('database is locked');
    });

    app.sseHub.heartbeat();

    expect((await reader.read()).done).toBe(true);
    const entry = lines
      .map(line => JSON.parse(line) as { msg?: string; sid?: string; err?: { message?: string } })
      .find(e => e.msg === MESSAGE);
    expect(entry?.sid).toBe(signed.sid);
    expect(entry?.err?.message).toBe('database is locked');
    const log = lines.join('\n');
    expect(log).not.toContain(signed.accessToken);
    expect(log).not.toContain(signed.refreshToken);
  });
});
