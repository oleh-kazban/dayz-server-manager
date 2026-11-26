import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase, servers } from '@aegis/database';

import { signSession } from '../__fixtures__/session-token';
import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { FakeProcessManager } from '../services/server/__fixtures__/fake-process-manager';

const SERVER_ID = '66666666-6666-4666-a666-666666666666';
const RPT = 'DayZServer_x64_2026-11-17_10-00-00.RPT';

describe('Server log stream security headers (AC-1)', () => {
  let installDir: string;
  let dbi: DatabaseInstance;
  let app: FastifyInstance;
  let url: string;

  beforeEach(async () => {
    installDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-logs-headers-'));
    fs.mkdirSync(path.join(installDir, 'profiles'), { recursive: true });
    fs.writeFileSync(path.join(installDir, 'profiles', RPT), 'loaded\n');
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
    url = `${origin}/api/v1/servers/${SERVER_ID}/logs/rpt/stream?file=${RPT}&from=7`;
  });

  afterEach(async () => {
    await app.close();
    dbi.close();
    fs.rmSync(installDir, { recursive: true, force: true });
  });

  it('carries the three headers and text/event-stream on the stream response', async () => {
    const signed = signSession(app);
    const res = await fetch(url, { headers: { authorization: `Bearer ${signed.accessToken}` } });
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    try {
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      expect(Object.fromEntries(res.headers)).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'no-referrer',
      });
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  });
});
