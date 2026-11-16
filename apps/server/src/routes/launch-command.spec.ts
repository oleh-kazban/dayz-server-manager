import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  apiErrorResponseSchema,
  DEFAULT_LAUNCH_OPTIONS,
  launchCommandPreviewSchema,
} from '@aegis/api-contracts';
import {
  configEditLocks,
  type DatabaseInstance,
  initDatabase,
  serverMods,
  servers,
  users,
} from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

const SERVER_ID = '22222222-2222-4222-a222-222222222222';
const EXPECTED_PLATFORM = process.platform === 'win32' ? 'win32' : 'linux';
const INSTALL_PATH = EXPECTED_PLATFORM === 'win32' ? 'C:\\DayZServer' : '/opt/dayz';

describe('Launch Command Route (GET /api/v1/servers/:id/launch-command)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    dbInstance = initDatabase({ dbPath: ':memory:' });
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      }),
      db: dbInstance,
    });
    await app.ready();

    adminToken = app.jwt.sign(
      { sub: 'admin-id', role: 'admin', type: 'access' },
      { expiresIn: '15m' },
    );
    viewerToken = app.jwt.sign(
      { sub: 'viewer-id', role: 'viewer', type: 'access' },
      { expiresIn: '15m' },
    );

    const now = new Date();
    dbInstance.db
      .insert(servers)
      .values({
        id: SERVER_ID,
        name: 'Launch Target',
        status: 'running',
        installPath: INSTALL_PATH,
        profilePath: 'profiles',
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        gamePort: 2402,
        launchOptions: { ...DEFAULT_LAUNCH_OPTIONS, filePatching: true },
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const mod = (id: string, folderName: string, loadOrder: number, extra = {}) => ({
      id,
      serverId: SERVER_ID,
      folderName,
      name: folderName || 'Unnamed',
      loadOrder,
      createdAt: now,
      updatedAt: now,
      ...extra,
    });
    dbInstance.db
      .insert(serverMods)
      .values([
        mod('m-2', '@Expansion', 2),
        mod('m-1', '@CF', 1),
        mod('m-3', '@AdminTools', 3, { loadTarget: 'server_only' }),
        mod('m-4', '', 4),
        mod('m-5', '@Disabled', 5, { enabled: false }),
      ])
      .run();
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  const get = (id: string, token?: string) =>
    app.inject({
      method: 'GET',
      url: `/api/v1/servers/${id}/launch-command`,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

  it('returns the compiled command for the saved server state, even while it runs', async () => {
    const response = await get(SERVER_ID, adminToken);

    expect(response.statusCode).toBe(200);
    const body = launchCommandPreviewSchema.parse(response.json());
    expect(body.serverId).toBe(SERVER_ID);
    expect(body.platform).toBe(EXPECTED_PLATFORM);
    expect(body.mods).toEqual({
      modFolders: ['@CF', '@Expansion'],
      serverModFolders: ['@AdminTools'],
      missingFolderCount: 1,
    });
    expect(body.command.ready).toBe(true);
    expect(body.command.cwd).toBe(INSTALL_PATH);
    expect(body.command.executable.startsWith(INSTALL_PATH)).toBe(true);
    expect(body.command.args).toEqual([
      '-config=serverDZ.cfg',
      '-port=2402',
      '-profiles=profiles',
      EXPECTED_PLATFORM === 'win32' ? '-BEpath=profiles\\BattlEye' : '-BEpath=profiles/BattlEye',
      '-mod=@CF;@Expansion',
      '-serverMod=@AdminTools',
      '-cpuCount=4',
      '-doLogs',
      '-adminLog',
      '-netLog',
      '-filePatching',
    ]);
    expect(body.command.issues.map(issue => issue.code)).toEqual([
      'LAUNCH_MOD_FOLDER_MISSING',
      'LAUNCH_FILE_PATCHING_ENABLED',
    ]);
  });

  it('reports no edit lock by default and the holder while serverDZ.cfg is being edited', async () => {
    expect((await get(SERVER_ID, adminToken)).json().editLock).toBeNull();

    const acquiredAt = new Date();
    dbInstance.db
      .insert(users)
      .values({
        id: 'editor-id',
        username: 'editor',
        passwordHash: 'x',
        role: 'admin',
        createdAt: acquiredAt,
      })
      .run();
    dbInstance.db
      .insert(configEditLocks)
      .values({
        serverId: SERVER_ID,
        fileKind: 'server_dz',
        sessionToken: '55555555-5555-4555-a555-555555555555',
        userId: 'editor-id',
        acquiredAt,
        expiresAt: new Date(acquiredAt.getTime() + 60_000),
      })
      .run();
    try {
      const body = launchCommandPreviewSchema.parse((await get(SERVER_ID, adminToken)).json());
      expect(body.editLock).toEqual({ holderName: 'editor', acquiredAt: acquiredAt.toISOString() });
    } finally {
      dbInstance.db.delete(configEditLocks).run();
    }
  });

  it('returns 401 without a token', async () => {
    expect((await get(SERVER_ID)).statusCode).toBe(401);
  });

  it('returns 403 for a non-admin token', async () => {
    const response = await get(SERVER_ID, viewerToken);
    expect(response.statusCode).toBe(403);
    expect(response.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
  });

  it('returns 400 for a malformed id and 404 for an unknown server', async () => {
    const malformed = await get('not-a-uuid', adminToken);
    expect(malformed.statusCode).toBe(400);
    expect(apiErrorResponseSchema.safeParse(malformed.json()).success).toBe(true);
    expect(malformed.json().errorCode).toBe('VALIDATION_FAILED');

    const missing = await get('33333333-3333-4333-a333-333333333333', adminToken);
    expect(missing.statusCode).toBe(404);
    expect(missing.json().errorCode).toBe('SERVER_NOT_FOUND');
  });
});
