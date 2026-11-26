import { eq } from 'drizzle-orm';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  apiErrorResponseSchema,
  configLockResponseSchema,
  configRevisionDetailSchema,
  configRevisionListSchema,
  saveServerDzConfigResponseSchema,
  SERVER_CONFIG_MAX_BYTES,
  serverDzConfigResponseSchema,
  syncBattlEyeConfigResponseSchema,
  validateServerDzConfigResponseSchema,
} from '@aegis/api-contracts';
import {
  configEditLocks,
  type DatabaseInstance,
  encryptVaultSecret,
  initDatabase,
  resolveVaultKey,
  serverConfigRevisions,
  servers,
  users,
} from '@aegis/database';

import { signSession } from '../__fixtures__/session-token';
import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { battlEyeConfigService } from '../services/server/battleye-config.service';
import { ServerDzConfigService } from '../services/server/server-dz-config.service';

const SERVER_ID = '55555555-5555-4555-a555-555555555555';
const MISSING_ID = '66666666-6666-4666-a666-666666666666';
const ADMIN = { id: 'route-admin', username: 'root', displayName: 'Root Admin' };
const OTHER_ADMIN = { id: 'route-admin-2', username: 'second', displayName: null };
const TAB_1 = '00000000-0000-4000-a000-0000000000a1';
const TAB_2 = '00000000-0000-4000-a000-0000000000a2';
const DISK_JOIN = 'route-disk-join';
const DISK_ADMIN = 'route-disk-admin';
const DB_RCON = 'RouteRcon!77';
const SECRETS = [DB_RCON];

const CFG_LF = [
  'hostname = "Route Server";',
  `password = "${DISK_JOIN}";`,
  `passwordAdmin = "${DISK_ADMIN}";`,
  'maxPlayers = 30;',
  'steamQueryPort = 27016;',
  'class Missions',
  '{',
  '\tclass DayZ',
  '\t{',
  '\t\ttemplate = "dayzOffline.chernarusplus";',
  '\t};',
  '};',
  '',
].join('\n');

type Method = 'GET' | 'POST' | 'PUT';

const ENDPOINTS: { method: Method; url: (id: string, rev?: string) => string }[] = [
  { method: 'GET', url: id => `/api/v1/servers/${id}/config/server-dz` },
  { method: 'POST', url: id => `/api/v1/servers/${id}/config/server-dz/validate` },
  { method: 'PUT', url: id => `/api/v1/servers/${id}/config/server-dz` },
  { method: 'POST', url: id => `/api/v1/servers/${id}/config/server-dz/bootstrap` },
  { method: 'POST', url: id => `/api/v1/servers/${id}/config/server-dz/lock` },
  { method: 'POST', url: id => `/api/v1/servers/${id}/config/server-dz/lock/heartbeat` },
  { method: 'POST', url: id => `/api/v1/servers/${id}/config/server-dz/lock/release` },
  { method: 'GET', url: id => `/api/v1/servers/${id}/config/server-dz/revisions` },
  { method: 'GET', url: (id, rev) => `/api/v1/servers/${id}/config/server-dz/revisions/${rev}` },
  {
    method: 'POST',
    url: (id, rev) => `/api/v1/servers/${id}/config/server-dz/revisions/${rev}/restore`,
  },
  { method: 'POST', url: id => `/api/v1/servers/${id}/config/battleye/sync` },
];

describe('Server config routes (/api/v1/servers/:id/config)', () => {
  let app: FastifyInstance;
  let dbi: DatabaseInstance;
  let tempRoot: string;
  let installDir: string;
  let cfgPath: string;
  let adminToken: string;
  let otherAdminToken: string;
  let moderatorToken: string;
  let rolelessToken: string;
  let setupToken: string;
  let saved: Record<string, string | undefined>;

  const encrypt = (plain: string) => encryptVaultSecret(plain, resolveVaultKey());

  async function call(
    method: Method,
    url: string,
    options: { token?: string | null; body?: unknown; rawBody?: string } = {},
  ): Promise<LightMyRequestResponse> {
    const token = options.token === undefined ? adminToken : options.token;
    const response = await app.inject({
      method,
      url,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.rawBody !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(options.body !== undefined ? { payload: options.body as object } : {}),
      ...(options.rawBody !== undefined ? { payload: options.rawBody } : {}),
    });
    for (const secret of SECRETS) {
      expect(response.body, `${method} ${url} leaked a secret`).not.toContain(secret);
    }
    return response;
  }

  const base = `/api/v1/servers/${SERVER_ID}/config/server-dz`;
  const lockRows = () => dbi.db.select().from(configEditLocks).all();
  const revisionRows = () => dbi.db.select().from(serverConfigRevisions).all();
  const serverRow = () => dbi.db.select().from(servers).where(eq(servers.id, SERVER_ID)).get()!;
  const expectApiError = (response: LightMyRequestResponse, status: number, errorCode: string) => {
    expect(response.statusCode).toBe(status);
    const body = response.json();
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
    expect(body.errorCode).toBe(errorCode);
    return body;
  };
  const lockAndLoad = async (sessionToken = TAB_1) => {
    expect((await call('POST', `${base}/lock`, { body: { sessionToken } })).statusCode).toBe(200);
    const loaded = await call('GET', `${base}?sessionToken=${sessionToken}`);
    return serverDzConfigResponseSchema.parse(loaded.json());
  };

  beforeAll(async () => {
    saved = {
      DSM_VAULT_KEY: process.env.DSM_VAULT_KEY,
      STEAM_VAULT_KEY: process.env.STEAM_VAULT_KEY,
      DSM_BACKUP_DIR: process.env.DSM_BACKUP_DIR,
    };
    delete process.env.STEAM_VAULT_KEY;
    process.env.DSM_VAULT_KEY = 'c3'.repeat(32);
    tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-config-route-')));
    process.env.DSM_BACKUP_DIR = path.join(tempRoot, 'backups');

    dbi = initDatabase({ dbPath: ':memory:' });
    for (const user of [ADMIN, OTHER_ADMIN]) {
      dbi.db
        .insert(users)
        .values({ ...user, passwordHash: 'x', role: 'admin', createdAt: new Date() })
        .run();
    }
    app = buildApp({
      config: loadEnv({
        SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
        LOG_LEVEL: 'silent',
      }),
      db: dbi,
    });
    await app.ready();
    const sign = (sub: string, role: string) =>
      signSession(app, { sub, tokenRole: role }).accessToken;
    adminToken = sign(ADMIN.id, 'admin');
    otherAdminToken = sign(OTHER_ADMIN.id, 'admin');
    moderatorToken = sign('route-moderator', 'moderator');
    rolelessToken = signSession(app, { sub: 'route-roleless', tokenRole: null }).accessToken;
    setupToken = sign('route-setup', 'setup');
  });

  afterAll(async () => {
    await app.close();
    dbi.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    installDir = fs.mkdtempSync(path.join(tempRoot, 'install-'));
    cfgPath = path.join(installDir, 'serverDZ.cfg');
    fs.mkdirSync(path.join(installDir, 'mpmissions', 'dayzOffline.chernarusplus'), {
      recursive: true,
    });
    fs.writeFileSync(cfgPath, CFG_LF.replace(/\n/g, '\r\n'));
    const now = new Date();
    dbi.db
      .insert(servers)
      .values({
        id: SERVER_ID,
        name: 'Route Server',
        status: 'stopped',
        installPath: installDir,
        profilePath: 'profiles',
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2310,
        rconPasswordEncrypted: encrypt(DB_RCON),
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    dbi.db.delete(servers).run();
  });

  describe('RBAC', () => {
    it('returns 401 without a token on every endpoint', async () => {
      const rev = crypto.randomUUID();
      for (const endpoint of ENDPOINTS) {
        const response = await call(endpoint.method, endpoint.url(SERVER_ID, rev), { token: null });
        expect(response.statusCode, endpoint.url(SERVER_ID, rev)).toBe(401);
      }
    });

    it.each([
      ['setup', () => setupToken],
      ['moderator', () => moderatorToken],
      ['roleless', () => rolelessToken],
    ])(
      'returns 403 AUTH_FORBIDDEN_ADMIN_REQUIRED for %s on every endpoint with zero mutation',
      async (_role, token) => {
        const rev = crypto.randomUUID();
        const diskBefore = fs.readFileSync(cfgPath);
        const body = { sessionToken: TAB_1, baseHash: 'a'.repeat(64), content: CFG_LF };
        for (const endpoint of ENDPOINTS) {
          const response = await call(endpoint.method, endpoint.url(SERVER_ID, rev), {
            token: token(),
            ...(endpoint.method === 'GET' ? {} : { body }),
          });
          expectApiError(response, 403, 'AUTH_FORBIDDEN_ADMIN_REQUIRED');
        }
        expect(lockRows()).toEqual([]);
        expect(revisionRows()).toEqual([]);
        expect(fs.readFileSync(cfgPath).equals(diskBefore)).toBe(true);
        expect(fs.existsSync(path.join(installDir, 'profiles'))).toBe(false);
      },
    );

    it('returns 400 for malformed server ids and 404 for unknown servers on every endpoint', async () => {
      const rev = crypto.randomUUID();
      const body = { sessionToken: TAB_1, baseHash: 'a'.repeat(64), content: CFG_LF };
      for (const endpoint of ENDPOINTS) {
        const opts = endpoint.method === 'GET' ? {} : { body };
        const bad = await call(endpoint.method, endpoint.url('not-a-uuid', rev), opts);
        expect(expectApiError(bad, 400, 'VALIDATION_FAILED').fieldErrors?.id?.code).toBe(
          'INVALID_UUID',
        );
        expectApiError(
          await call(endpoint.method, endpoint.url(MISSING_ID, rev), opts),
          404,
          'SERVER_NOT_FOUND',
        );
      }
    });
  });

  describe('GET /server-dz', () => {
    it('returns the plaintext file and lock state per session token', async () => {
      const loaded = await lockAndLoad();
      expect(loaded.exists).toBe(true);
      expect(loaded.eol).toBe('crlf');
      expect(loaded.lock).toMatchObject({ holderName: 'Root Admin', heldByYou: true });
      expect(loaded.content).toContain(`password = "${DISK_JOIN}";`);
      expect(loaded.content).toContain(`passwordAdmin = "${DISK_ADMIN}";`);

      const other = await call('GET', `${base}?sessionToken=${TAB_2}`);
      expect(other.json().lock.heldByYou).toBe(false);
      const anonymous = await call('GET', base);
      expect(anonymous.json().lock.heldByYou).toBe(false);
      expect(revisionRows()).toHaveLength(1);
    });

    it('returns exists:false for a missing file and 400 for a malformed session token', async () => {
      fs.rmSync(cfgPath);
      const missing = await call('GET', base);
      expect(missing.statusCode).toBe(200);
      expect(missing.json()).toMatchObject({ exists: false, content: null });

      expectApiError(await call('GET', `${base}?sessionToken=nope`), 400, 'VALIDATION_FAILED');
    });

    it('maps storage errors to their status and propagates unexpected errors as 500', async () => {
      fs.rmSync(cfgPath);
      fs.mkdirSync(cfgPath);
      expectApiError(await call('GET', base), 400, 'CONFIG_PATH_INVALID');

      vi.spyOn(ServerDzConfigService.prototype, 'load').mockImplementationOnce(() => {
        throw new Error('unexpected');
      });
      expectApiError(await call('GET', base), 500, 'INTERNAL_SERVER_ERROR');
    });
  });

  describe('POST /server-dz/validate', () => {
    it('returns diagnostics for valid and invalid content', async () => {
      const ok = await call('POST', `${base}/validate`, { body: { content: CFG_LF } });
      expect(ok.statusCode).toBe(200);
      expect(validateServerDzConfigResponseSchema.parse(ok.json()).valid).toBe(true);

      const bad = await call('POST', `${base}/validate`, {
        body: { content: CFG_LF.replace('chernarusplus', 'missing') },
      });
      expect(bad.json().valid).toBe(false);
      expect(bad.json().diagnostics.map((d: { code: string }) => d.code)).toContain(
        'MISSION_NOT_FOUND',
      );
    });

    it('rejects oversized content with 413, missing bodies with 400, and huge bodies with 413', async () => {
      const big = await call('POST', `${base}/validate`, {
        body: { content: 'x'.repeat(SERVER_CONFIG_MAX_BYTES + 1) },
      });
      expect(expectApiError(big, 413, 'CONFIG_FILE_TOO_LARGE').params).toEqual({
        maxBytes: SERVER_CONFIG_MAX_BYTES,
      });

      expectApiError(await call('POST', `${base}/validate`), 400, 'VALIDATION_FAILED');
      expectApiError(
        await call('POST', `${base}/validate`, { body: { content: 42 } }),
        400,
        'VALIDATION_FAILED',
      );

      const huge = await call('POST', `${base}/validate`, {
        body: { content: 'x'.repeat(SERVER_CONFIG_MAX_BYTES * 3) },
      });
      expectApiError(huge, 413, 'CONFIG_FILE_TOO_LARGE');

      // Non-413 body errors fall through to the app-wide handler (same result as other routes).
      const malformed = await call('POST', `${base}/validate`, { rawBody: '{"content":' });
      const elsewhere = await call('POST', `/api/v1/servers/${SERVER_ID}/validate-paths`, {
        rawBody: '{"content":',
      });
      expect(malformed.statusCode).toBe(elsewhere.statusCode);
      expect(malformed.json().errorCode).toBe(elsewhere.json().errorCode);
      expect(malformed.json().errorCode).not.toBe('CONFIG_FILE_TOO_LARGE');
    });
  });

  describe('PUT /server-dz', () => {
    it('saves with the lock and returns the new hash and revision', async () => {
      const loaded = await lockAndLoad();
      const response = await call('PUT', base, {
        body: {
          sessionToken: TAB_1,
          baseHash: loaded.contentHash,
          content: loaded
            .content!.replace('maxPlayers = 30', 'maxPlayers = 31')
            .replace(`"${DISK_ADMIN}"`, '"edited-route-admin"'),
        },
      });
      expect(response.statusCode).toBe(200);
      const body = saveServerDzConfigResponseSchema.parse(response.json());
      expect(body.revision).toMatchObject({ source: 'editor', authorName: 'Root Admin' });
      const disk = fs.readFileSync(cfgPath, 'utf8');
      expect(disk).toContain('passwordAdmin = "edited-route-admin";');
      expect(disk).toContain('maxPlayers = 31;\r\n');
      expect(serverRow().maxPlayers).toBe(31);
    });

    it('refuses without the lock, with a stale hash, invalid content, or oversized content, leaving disk unchanged', async () => {
      const loaded = await lockAndLoad();
      const diskBefore = fs.readFileSync(cfgPath);
      const revisionsBefore = revisionRows();

      const notHeld = await call('PUT', base, {
        token: otherAdminToken,
        body: { sessionToken: TAB_1, baseHash: loaded.contentHash, content: loaded.content },
      });
      expect(expectApiError(notHeld, 409, 'CONFIG_LOCK_NOT_HELD').params).toBeUndefined();

      expectApiError(
        await call('PUT', base, {
          body: { sessionToken: TAB_1, baseHash: 'f'.repeat(64), content: loaded.content },
        }),
        409,
        'CONFIG_HASH_MISMATCH',
      );

      const invalid = await call('PUT', base, {
        body: { sessionToken: TAB_1, baseHash: loaded.contentHash, content: 'hostname = "x"' },
      });
      const invalidBody = expectApiError(invalid, 422, 'CONFIG_VALIDATION_FAILED');
      expect(invalidBody.params).toEqual({
        errorCount: expect.any(Number),
        firstLine: expect.any(Number),
        firstMessage: expect.any(String),
      });

      expectApiError(
        await call('PUT', base, {
          body: {
            sessionToken: TAB_1,
            baseHash: loaded.contentHash,
            content: 'y'.repeat(SERVER_CONFIG_MAX_BYTES + 1),
          },
        }),
        413,
        'CONFIG_FILE_TOO_LARGE',
      );
      expectApiError(
        await call('PUT', base, { body: { sessionToken: 'x' } }),
        400,
        'VALIDATION_FAILED',
      );

      dbi.db.update(servers).set({ status: 'running' }).where(eq(servers.id, SERVER_ID)).run();
      const running = await call('PUT', base, {
        body: { sessionToken: TAB_1, baseHash: loaded.contentHash, content: loaded.content },
      });
      expect(expectApiError(running, 409, 'SERVER_RUNNING_CONFIG_LOCKED').params).toMatchObject({
        status: 'running',
      });

      expect(fs.readFileSync(cfgPath).equals(diskBefore)).toBe(true);
      expect(revisionRows()).toEqual(revisionsBefore);
    });
  });

  describe('POST /server-dz/bootstrap', () => {
    it('creates a missing file with 201 and refuses an existing one with 409', async () => {
      expect(
        (await call('POST', `${base}/lock`, { body: { sessionToken: TAB_1 } })).statusCode,
      ).toBe(200);
      const exists = await call('POST', `${base}/bootstrap`, { body: { sessionToken: TAB_1 } });
      expectApiError(exists, 409, 'CONFIG_FILE_EXISTS');

      fs.rmSync(cfgPath);
      const created = await call('POST', `${base}/bootstrap`, { body: { sessionToken: TAB_1 } });
      expect(created.statusCode).toBe(201);
      expect(saveServerDzConfigResponseSchema.parse(created.json()).revision.source).toBe(
        'template',
      );
      const diskText = fs.readFileSync(cfgPath, 'utf8');
      expect(diskText).toContain('password = "";');
      expect(diskText).toContain('passwordAdmin = "";');

      expectApiError(
        await call('POST', `${base}/bootstrap`, { body: {} }),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('lock endpoints', () => {
    it('acquires, refuses other sessions with holder info, heartbeats, takes over, and releases', async () => {
      const acquired = await call('POST', `${base}/lock`, { body: { sessionToken: TAB_1 } });
      expect(acquired.statusCode).toBe(200);
      expect(configLockResponseSchema.parse(acquired.json())).toMatchObject({
        holderUserId: ADMIN.id,
        holderName: 'Root Admin',
        heldByYou: true,
      });

      const conflict = await call('POST', `${base}/lock`, {
        token: otherAdminToken,
        body: { sessionToken: TAB_2 },
      });
      expect(expectApiError(conflict, 409, 'CONFIG_EDIT_LOCKED').params).toEqual({
        holderName: 'Root Admin',
        acquiredAt: acquired.json().acquiredAt,
      });
      const otherTab = await call('POST', `${base}/lock`, { body: { sessionToken: TAB_2 } });
      expectApiError(otherTab, 409, 'CONFIG_EDIT_LOCKED');

      const beat = await call('POST', `${base}/lock/heartbeat`, { body: { sessionToken: TAB_1 } });
      expect(beat.statusCode).toBe(200);
      expect(beat.json().heldByYou).toBe(true);

      const takeover = await call('POST', `${base}/lock`, {
        token: otherAdminToken,
        body: { sessionToken: TAB_2, takeover: true },
      });
      expect(takeover.json()).toMatchObject({
        holderUserId: OTHER_ADMIN.id,
        holderName: 'second',
        heldByYou: true,
      });

      expectApiError(
        await call('POST', `${base}/lock/heartbeat`, { body: { sessionToken: TAB_1 } }),
        409,
        'CONFIG_LOCK_NOT_HELD',
      );
      expect(
        (await call('POST', `${base}/lock/release`, { body: { sessionToken: TAB_1 } })).json(),
      ).toEqual({
        released: false,
      });
      expect(
        (
          await call('POST', `${base}/lock/release`, {
            token: otherAdminToken,
            body: { sessionToken: TAB_2 },
          })
        ).json(),
      ).toEqual({ released: true });
      expect(lockRows()).toEqual([]);
    });

    it('refuses lock acquisition while running and validates bodies', async () => {
      dbi.db.update(servers).set({ status: 'stopping' }).where(eq(servers.id, SERVER_ID)).run();
      expectApiError(
        await call('POST', `${base}/lock`, { body: { sessionToken: TAB_1 } }),
        409,
        'SERVER_RUNNING_CONFIG_LOCKED',
      );
      expect(lockRows()).toEqual([]);
      for (const suffix of ['/lock', '/lock/heartbeat', '/lock/release']) {
        expectApiError(
          await call('POST', `${base}${suffix}`, { body: { sessionToken: 'bad' } }),
          400,
          'VALIDATION_FAILED',
        );
      }
    });
  });

  describe('revision endpoints', () => {
    it('lists, reads, and restores revisions', async () => {
      const loaded = await lockAndLoad();
      const externalId = loaded.latestRevision!.id;
      const save = await call('PUT', base, {
        body: {
          sessionToken: TAB_1,
          baseHash: loaded.contentHash,
          content: loaded.content!.replace('maxPlayers = 30', 'maxPlayers = 35'),
        },
      });

      const list = await call('GET', `${base}/revisions`);
      expect(list.statusCode).toBe(200);
      expect(configRevisionListSchema.parse(list.json()).map(r => r.source)).toEqual([
        'editor',
        'external',
      ]);

      const detail = await call('GET', `${base}/revisions/${externalId}`);
      expect(configRevisionDetailSchema.parse(detail.json()).content).toContain('maxPlayers = 30;');

      const restored = await call('POST', `${base}/revisions/${externalId}/restore`, {
        body: { sessionToken: TAB_1, baseHash: save.json().contentHash },
      });
      expect(restored.statusCode).toBe(200);
      expect(restored.json().revision.source).toBe('restore');
      expect(fs.readFileSync(cfgPath, 'utf8')).toContain('maxPlayers = 30;');
    });

    it('returns 404 for unknown revisions, 400 for malformed ids or bodies, and 409 on restore guards', async () => {
      const loaded = await lockAndLoad();
      const revisionId = loaded.latestRevision!.id;
      const unknown = crypto.randomUUID();

      expect(
        expectApiError(
          await call('GET', `${base}/revisions/${unknown}`),
          404,
          'CONFIG_REVISION_NOT_FOUND',
        ).params,
      ).toEqual({ revisionId: unknown });
      expect(
        expectApiError(await call('GET', `${base}/revisions/not-a-uuid`), 400, 'VALIDATION_FAILED')
          .fieldErrors?.revisionId?.code,
      ).toBe('INVALID_UUID');
      expectApiError(
        await call('POST', `${base}/revisions/not-a-uuid/restore`, {
          body: { sessionToken: TAB_1, baseHash: loaded.contentHash },
        }),
        400,
        'VALIDATION_FAILED',
      );
      expectApiError(
        await call('POST', `${base}/revisions/${revisionId}/restore`, {
          body: { sessionToken: TAB_1 },
        }),
        400,
        'VALIDATION_FAILED',
      );
      expectApiError(
        await call('POST', `${base}/revisions/${unknown}/restore`, {
          body: { sessionToken: TAB_1, baseHash: loaded.contentHash },
        }),
        404,
        'CONFIG_REVISION_NOT_FOUND',
      );
      expectApiError(
        await call('POST', `${base}/revisions/${revisionId}/restore`, {
          body: { sessionToken: TAB_1, baseHash: 'e'.repeat(64) },
        }),
        409,
        'CONFIG_HASH_MISMATCH',
      );
      expect(revisionRows()).toHaveLength(1);
    });
  });

  describe('POST /battleye/sync', () => {
    const url = `/api/v1/servers/${SERVER_ID}/config/battleye/sync`;

    it('regenerates the BattlEye file without touching serverDZ.cfg', async () => {
      const diskBefore = fs.readFileSync(cfgPath);
      const response = await call('POST', url);
      expect(response.statusCode).toBe(200);
      const body = syncBattlEyeConfigResponseSchema.parse(response.json());
      expect(body.battleyeCfgWritten).toBe(true);
      expect(fs.readFileSync(body.battleyeCfgPath, 'utf8')).toContain(`RConPassword ${DB_RCON}`);
      expect(fs.readFileSync(cfgPath).equals(diskBefore)).toBe(true);
    });

    it('maps vault, storage, and unexpected failures', async () => {
      dbi.db
        .update(servers)
        .set({ rconPasswordEncrypted: 'corrupt' })
        .where(eq(servers.id, SERVER_ID))
        .run();
      expectApiError(await call('POST', url), 500, 'VAULT_KEY_UNAVAILABLE');

      dbi.db
        .update(servers)
        .set({ rconPasswordEncrypted: null, rconPassword: null })
        .where(eq(servers.id, SERVER_ID))
        .run();
      expectApiError(await call('POST', url), 409, 'CONFIG_RCON_PASSWORD_REQUIRED');

      vi.spyOn(battlEyeConfigService, 'syncBattlEyeConfig').mockImplementationOnce(() => {
        throw new Error('boom');
      });
      expectApiError(await call('POST', url), 500, 'INTERNAL_SERVER_ERROR');
      expect(fs.existsSync(path.join(installDir, 'profiles'))).toBe(false);
    });
  });
});
