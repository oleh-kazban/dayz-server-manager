import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@aegis/database', async importOriginal => {
  const actual = await importOriginal<typeof import('@aegis/database')>();
  return {
    ...actual,
    resolveVaultKey: vi.fn(actual.resolveVaultKey),
    verifyVaultKey: vi.fn(actual.verifyVaultKey),
    encryptVaultSecret: vi.fn(actual.encryptVaultSecret),
    decryptVaultSecret: vi.fn(actual.decryptVaultSecret),
  };
});

import { apiErrorResponseSchema, validateServerPathsResponseSchema } from '@aegis/api-contracts';
import * as databaseModule from '@aegis/database';
import {
  configEditLocks,
  type DatabaseInstance,
  initDatabase,
  servers,
  users,
} from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { getBattlEyeConfigFilename } from '../services/server/battleye-config.service';
import { CONFIG_EDIT_LOCK_TTL_MS } from '../services/server/config-edit-lock.service';
import { serverFsInspectorService } from '../services/server/server-fs-inspector.service';

describe('Servers Routes (/api/v1/servers)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let adminToken: string;
  let viewerToken: string;
  let defaultServerId: string;
  let routeTempRoot: string;
  let savedDsmVaultKey: string | undefined;
  let savedSteamVaultKey: string | undefined;
  let savedDsmBackupDir: string | undefined;

  beforeAll(async () => {
    savedDsmVaultKey = process.env.DSM_VAULT_KEY;
    savedSteamVaultKey = process.env.STEAM_VAULT_KEY;
    savedDsmBackupDir = process.env.DSM_BACKUP_DIR;
    delete process.env.STEAM_VAULT_KEY;
    process.env.DSM_VAULT_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    routeTempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-servers-route-')));
    process.env.DSM_BACKUP_DIR = path.join(routeTempRoot, 'backups');

    dbInstance = initDatabase({ dbPath: ':memory:' });
    const config = loadEnv({
      SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
      LOG_LEVEL: 'silent',
    });

    app = buildApp({
      config,
      db: dbInstance,
    });

    await app.ready();

    // Generate tokens for test roles
    adminToken = app.jwt.sign(
      { sub: 'admin-id', role: 'admin', type: 'access' },
      { expiresIn: '15m' },
    );
    viewerToken = app.jwt.sign(
      { sub: 'viewer-id', role: 'viewer', type: 'access' },
      { expiresIn: '15m' },
    );

    // Seed initial test server for test suite baseline
    defaultServerId = '11111111-1111-4111-a111-111111111111';
    const now = new Date();
    dbInstance.db
      .insert(servers)
      .values({
        id: defaultServerId,
        name: 'DayZ (Local)',
        description: 'Primary local DayZ Dedicated Server instance',
        isDefault: true,
        status: 'stopped',
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2310,
        rconPassword: 'test-rcon-password',
        installPath: 'C:\\DayZServer',
        profilePath: 'profiles',
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        createdAt: now,
        updatedAt: now,
      })
      .run();
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
    if (savedDsmVaultKey !== undefined) {
      process.env.DSM_VAULT_KEY = savedDsmVaultKey;
    } else {
      delete process.env.DSM_VAULT_KEY;
    }
    if (savedSteamVaultKey !== undefined) {
      process.env.STEAM_VAULT_KEY = savedSteamVaultKey;
    } else {
      delete process.env.STEAM_VAULT_KEY;
    }
    if (savedDsmBackupDir !== undefined) {
      process.env.DSM_BACKUP_DIR = savedDsmBackupDir;
    } else {
      delete process.env.DSM_BACKUP_DIR;
    }
    fs.rmSync(routeTempRoot, { recursive: true, force: true });
  });

  describe('GET /api/v1/servers', () => {
    it('returns 401 when token is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/servers',
      });
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_TOKEN_MISSING_OR_INVALID');
    });

    it('returns 200 and list of servers for authenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const list = response.json();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(defaultServerId);
      expect(list[0].name).toBe('DayZ (Local)');
      expect(list[0].isDefault).toBe(true);
    });
  });

  describe('GET /api/v1/servers/:id', () => {
    it('returns 400 when :id is not a valid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/servers/invalid-uuid-string-or-injection',
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      expect(body.fieldErrors?.id).toEqual({
        code: 'INVALID_UUID',
        message: expect.stringContaining('Must be a valid UUID'),
      });
    });

    it('returns 404 for non-existent server', async () => {
      const missingId = '123e4567-e89b-12d3-a456-426614174999';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${missingId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_NOT_FOUND');
      expect(body.params).toEqual({ id: missingId });
    });

    it('returns 200 with server detail for valid id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${defaultServerId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(200);
      const detail = response.json();
      expect(detail.id).toBe(defaultServerId);
      expect(detail.installPath).toBeDefined();
      expect(detail.missionPath).toBe('mpmissions/dayzOffline.chernarusplus');
    });
  });

  describe('POST /api/v1/servers', () => {
    it('returns 403 for non-admin user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: {
          name: 'Forbidden Server',
          installPath: '/opt/dayz',
          profilePath: '/opt/dayz/profiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
        },
      });
      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
    });

    it('returns 400 for invalid body or intra-server port collision', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Colliding Server',
          installPath: '/opt/dayz',
          profilePath: '/opt/dayz/profiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
          gamePort: 2402,
          queryPort: 2402, // Intra-server collision
          rconPort: 2311,
        },
      });
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      expect(body.fieldErrors?.gamePort).toEqual({
        code: 'PORTS_NOT_DISTINCT',
        message: expect.stringContaining('distinct'),
      });
    });

    it('returns 400 when filesystem path contains directory traversal or null bytes', async () => {
      const responseTraversal = await app.inject({
        method: 'POST',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Traversal Server',
          installPath: 'C:\\DayZServer\\..\\..\\Windows\\System32',
          profilePath: 'profiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
        },
      });
      expect(responseTraversal.statusCode).toBe(400);
      const traversalBody = responseTraversal.json();
      expect(apiErrorResponseSchema.safeParse(traversalBody).success).toBe(true);
      expect(traversalBody.errorCode).toBe('VALIDATION_FAILED');
      expect(traversalBody.fieldErrors?.installPath?.code).toBe('PATH_TRAVERSAL_FORBIDDEN');
      expect(traversalBody.message).toContain('Path traversal');

      const responseNull = await app.inject({
        method: 'POST',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Null Injection Server',
          installPath: 'C:\\DayZServer\0malicious',
          profilePath: 'profiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
        },
      });
      expect(responseNull.statusCode).toBe(400);
      const nullBody = responseNull.json();
      expect(apiErrorResponseSchema.safeParse(nullBody).success).toBe(true);
      expect(nullBody.errorCode).toBe('VALIDATION_FAILED');
      expect(nullBody.fieldErrors?.installPath?.code).toBe('PATH_NULL_BYTES_FORBIDDEN');
      expect(nullBody.message).toContain('Null bytes are forbidden');
    });

    it('returns 409 when server name already exists and populates fieldErrors.name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'DayZ (Local)', // Existing name
          installPath: '/opt/dayz',
          profilePath: '/opt/dayz/profiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
          gamePort: 2402,
          queryPort: 27017,
          rconPort: 2311,
        },
      });
      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_NAME_CONFLICT');
      expect(body.params).toEqual({ name: 'DayZ (Local)' });
      expect(body.fieldErrors).toEqual({
        name: {
          code: 'SERVER_NAME_CONFLICT',
          message: "Server with name 'DayZ (Local)' already exists",
          params: { name: 'DayZ (Local)' },
        },
      });
    });

    it('returns 409 when port collides with an existing server on the host and populates fieldErrors.gamePort', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Port Colliding Server',
          installPath: '/opt/dayz',
          profilePath: '/opt/dayz/profiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
          gamePort: 2302, // Collides with defaultServerId gamePort
          queryPort: 27018,
          rconPort: 2311,
        },
      });
      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_PORT_COLLISION');
      expect(body.params).toEqual({
        port: 2302,
        occupiedBy: 'DayZ (Local)',
        occupiedById: defaultServerId,
      });
      expect(body.fieldErrors).toEqual({
        gamePort: {
          code: 'SERVER_PORT_COLLISION',
          message: expect.stringContaining('collides with existing server'),
          params: {
            port: 2302,
            occupiedBy: 'DayZ (Local)',
            occupiedById: defaultServerId,
          },
        },
      });
      expect(body.message).toContain('collides with existing server');
    });

    it('aggregates simultaneous name and multi-port conflicts in a single 409 response with zero DB mutations (REQ-01, GUARD-01)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'DayZ (Local)',
          installPath: '/opt/dayz',
          profilePath: '/opt/dayz/profiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
          gamePort: 2302,
          queryPort: 27016,
          rconPort: 2310,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_NAME_CONFLICT');
      expect(body.params).toEqual({ name: 'DayZ (Local)' });
      expect(body.fieldErrors).toEqual({
        name: {
          code: 'SERVER_NAME_CONFLICT',
          message: "Server with name 'DayZ (Local)' already exists",
          params: { name: 'DayZ (Local)' },
        },
        gamePort: {
          code: 'SERVER_PORT_COLLISION',
          message: expect.stringContaining('Port 2302 collides'),
          params: {
            port: 2302,
            occupiedBy: 'DayZ (Local)',
            occupiedById: defaultServerId,
          },
        },
        queryPort: {
          code: 'SERVER_PORT_COLLISION',
          message: expect.stringContaining('Port 27016 collides'),
          params: {
            port: 27016,
            occupiedBy: 'DayZ (Local)',
            occupiedById: defaultServerId,
          },
        },
        rconPort: {
          code: 'SERVER_PORT_COLLISION',
          message: expect.stringContaining('Port 2310 collides'),
          params: {
            port: 2310,
            occupiedBy: 'DayZ (Local)',
            occupiedById: defaultServerId,
          },
        },
      });

      expect(dbInstance.db.select().from(servers).all()).toHaveLength(1);
    });

    it('returns 201 and creates new server when valid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Livonia Hardcore',
          description: '1PP Hardcore Survival',
          installPath: '/opt/dayz-livonia',
          profilePath: '/opt/dayz-livonia/profiles',
          missionPath: 'mpmissions/dayzOffline.enoch',
          gamePort: 2402,
          queryPort: 27017,
          rconPort: 2311,
          isDefault: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created.name).toBe('Livonia Hardcore');
      expect(created.isDefault).toBe(true);

      // Verify previous default server is no longer default
      const defaultServer = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();
      expect(defaultServer!.isDefault).toBe(false);
    });
  });

  describe('PATCH /api/v1/servers/:id', () => {
    let secondServerId: string;

    beforeAll(async () => {
      const s = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.name, 'Livonia Hardcore'))
        .get();
      secondServerId = s!.id;
    });

    it('returns 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: { name: 'Unauthorized Change' },
      });
      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
    });

    it('returns 400 for malformed non-UUID server id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/servers/malformed-id',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'Ghost' },
      });
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      expect(body.fieldErrors?.id?.code).toBe('INVALID_UUID');
      expect(body.message).toContain('Must be a valid UUID');
    });

    it('returns 404 for unknown server id', async () => {
      const unknownId = '123e4567-e89b-12d3-a456-426614174999';
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${unknownId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'Ghost' },
      });
      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_NOT_FOUND');
      expect(body.params).toEqual({ id: unknownId });
    });

    it('enforces GUARD-SRV-03: returns 409 when altering ports while server is running', async () => {
      // Simulate server running
      dbInstance.db
        .update(servers)
        .set({ status: 'running' })
        .where(eq(servers.id, secondServerId))
        .run();

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { gamePort: 2502 },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_RUNNING_CONFIG_LOCKED');
      expect(body.params).toEqual({
        id: secondServerId,
        name: 'Livonia Hardcore',
        status: 'running',
      });
      expect(body.message).toContain('Cannot alter server configuration');

      // Test path alteration while running
      const pathResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { installPath: '/new/path' },
      });
      expect(pathResponse.statusCode).toBe(409);
      const pathBody = pathResponse.json();
      expect(apiErrorResponseSchema.safeParse(pathBody).success).toBe(true);
      expect(pathBody.errorCode).toBe('SERVER_RUNNING_CONFIG_LOCKED');

      const missionResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { missionPath: 'mpmissions/dayzOffline.sakhal' },
      });
      expect(missionResponse.statusCode).toBe(409);
      const missionBody = missionResponse.json();
      expect(apiErrorResponseSchema.safeParse(missionBody).success).toBe(true);
      expect(missionBody.errorCode).toBe('SERVER_RUNNING_CONFIG_LOCKED');

      // Verify zero database mutation occurred on refusal
      const unchanged = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, secondServerId))
        .get();
      expect(unchanged!.gamePort).toBe(2402);
      expect(unchanged!.installPath).toBe('/opt/dayz-livonia');
      expect(unchanged!.missionPath).toBe('mpmissions/dayzOffline.enoch');

      // Reset to stopped
      dbInstance.db
        .update(servers)
        .set({ status: 'stopped' })
        .where(eq(servers.id, secondServerId))
        .run();
    });

    it.each(['starting', 'stopping'] as const)(
      'enforces GUARD-SRV-03: returns 409 when altering ports or paths while server is %s',
      async activeStatus => {
        dbInstance.db
          .update(servers)
          .set({ status: activeStatus })
          .where(eq(servers.id, secondServerId))
          .run();

        const portResponse = await app.inject({
          method: 'PATCH',
          url: `/api/v1/servers/${secondServerId}`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: { gamePort: 2502 },
        });

        expect(portResponse.statusCode).toBe(409);
        const portBody = portResponse.json();
        expect(apiErrorResponseSchema.safeParse(portBody).success).toBe(true);
        expect(portBody.errorCode).toBe('SERVER_RUNNING_CONFIG_LOCKED');
        expect(portBody.params).toEqual({
          id: secondServerId,
          name: 'Livonia Hardcore',
          status: activeStatus,
        });

        const pathResponse = await app.inject({
          method: 'PATCH',
          url: `/api/v1/servers/${secondServerId}`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: { installPath: '/new/path' },
        });

        expect(pathResponse.statusCode).toBe(409);
        const pathBody = pathResponse.json();
        expect(apiErrorResponseSchema.safeParse(pathBody).success).toBe(true);
        expect(pathBody.errorCode).toBe('SERVER_RUNNING_CONFIG_LOCKED');

        // Verify zero database mutation occurred on refusal
        const unchanged = dbInstance.db
          .select()
          .from(servers)
          .where(eq(servers.id, secondServerId))
          .get();
        expect(unchanged!.gamePort).toBe(2402);
        expect(unchanged!.installPath).toBe('/opt/dayz-livonia');

        dbInstance.db
          .update(servers)
          .set({ status: 'stopped' })
          .where(eq(servers.id, secondServerId))
          .run();
      },
    );

    it('allows altering ports and paths when server status is failed (returns 200)', async () => {
      dbInstance.db
        .update(servers)
        .set({ status: 'failed' })
        .where(eq(servers.id, secondServerId))
        .run();

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          gamePort: 2502,
          installPath: 'C:\\DayZServerUpdated',
        },
      });

      expect(response.statusCode).toBe(200);
      const updated = response.json();
      expect(updated.gamePort).toBe(2502);
      expect(updated.installPath).toBe('C:\\DayZServerUpdated');

      // Reset port, installPath, and status to stopped for subsequent tests
      dbInstance.db
        .update(servers)
        .set({
          status: 'stopped',
          gamePort: 2402,
          installPath: '/opt/dayz-livonia',
        })
        .where(eq(servers.id, secondServerId))
        .run();
    });

    it('returns 409 if renaming to an existing server name and populates fieldErrors.name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'DayZ (Local)' },
      });
      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_NAME_CONFLICT');
      expect(body.params).toEqual({ name: 'DayZ (Local)' });
      expect(body.fieldErrors).toEqual({
        name: {
          code: 'SERVER_NAME_CONFLICT',
          message: "Server with name 'DayZ (Local)' already exists",
          params: { name: 'DayZ (Local)' },
        },
      });
    });

    it('returns 409 if port update collides with another server and populates fieldErrors.gamePort', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { gamePort: 2302 }, // Collides with defaultServerId
      });
      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_PORT_COLLISION');
      expect(body.params).toEqual({
        port: 2302,
        occupiedBy: 'DayZ (Local)',
        occupiedById: defaultServerId,
      });
      expect(body.fieldErrors).toEqual({
        gamePort: {
          code: 'SERVER_PORT_COLLISION',
          message: expect.stringContaining('Port 2302 collides'),
          params: {
            port: 2302,
            occupiedBy: 'DayZ (Local)',
            occupiedById: defaultServerId,
          },
        },
      });
    });

    it('aggregates simultaneous name and multi-port conflicts on PATCH in a single 409 response with zero DB mutations (REQ-01, GUARD-01)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        // queryPort is owned by serverDZ.cfg and is stripped from PATCH bodies.
        payload: {
          name: 'DayZ (Local)',
          gamePort: 2302,
          queryPort: 27016,
          rconPort: 2310,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_NAME_CONFLICT');
      expect(body.fieldErrors).toEqual({
        name: {
          code: 'SERVER_NAME_CONFLICT',
          message: "Server with name 'DayZ (Local)' already exists",
          params: { name: 'DayZ (Local)' },
        },
        gamePort: {
          code: 'SERVER_PORT_COLLISION',
          message: expect.stringContaining('Port 2302 collides'),
          params: {
            port: 2302,
            occupiedBy: 'DayZ (Local)',
            occupiedById: defaultServerId,
          },
        },
        rconPort: {
          code: 'SERVER_PORT_COLLISION',
          message: expect.stringContaining('Port 2310 collides'),
          params: {
            port: 2310,
            occupiedBy: 'DayZ (Local)',
            occupiedById: defaultServerId,
          },
        },
      });

      const unchanged = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, secondServerId))
        .get();
      expect(unchanged!.name).toBe('Livonia Hardcore');
      expect(unchanged!.gamePort).toBe(2402);
      expect(unchanged!.queryPort).toBe(27017);
      expect(unchanged!.rconPort).toBe(2311);
    });

    it('returns 400 if updating port causes intra-server collision', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { gamePort: 27017 }, // queryPort is already 27017!
      });
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_PORTS_NOT_DISTINCT');
      expect(body.fieldErrors?.gamePort).toEqual({
        code: 'PORTS_NOT_DISTINCT',
        message: 'Effective gamePort, queryPort, and rconPort must all be distinct',
      });
    });

    it('preserves existing default server when PATCH with isDefault: true fails with 409 name conflict (transactional rollback)', async () => {
      const beforeSecond = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, secondServerId))
        .get();
      expect(beforeSecond!.isDefault).toBe(true);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${defaultServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Livonia Hardcore',
          isDefault: true,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_NAME_CONFLICT');

      const afterSecond = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, secondServerId))
        .get();
      const afterDefault = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();
      expect(afterSecond!.isDefault).toBe(true);
      expect(afterDefault!.isDefault).toBe(false);
      expect(afterDefault!.name).toBe('DayZ (Local)');
    });

    it('returns 200 and updates server fields cleanly', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          description: 'Updated description',
          gamePort: 2404,
          isDefault: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const updated = response.json();
      expect(updated.description).toBe('Updated description');
      expect(updated.gamePort).toBe(2404);
      expect(updated.isDefault).toBe(true);

      // Verify other server lost default
      const defaultServer = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();
      expect(defaultServer!.isDefault).toBe(false);
    });
  });

  describe('POST /api/v1/servers/:id/validate-paths', () => {
    const tempDirs: string[] = [];

    const createTempDayzHost = () => {
      const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-route-fs-')));
      tempDirs.push(root);

      const installDir = path.join(root, 'DayZServer');
      const profileDir = path.join(installDir, 'profiles');
      const battleyeDir = path.join(profileDir, 'BattlEye');
      const missionDir = path.join(installDir, 'mpmissions', 'dayzOffline.chernarusplus');

      fs.mkdirSync(battleyeDir, { recursive: true });
      fs.mkdirSync(path.join(missionDir, 'db'), { recursive: true });
      fs.writeFileSync(path.join(missionDir, 'init.c'), 'void main() {}');

      const exeName = process.platform === 'win32' ? 'DayZServer_x64.exe' : 'DayZServer';
      const exePath = path.join(installDir, exeName);
      fs.writeFileSync(exePath, 'binary');
      if (process.platform !== 'win32') {
        fs.chmodSync(exePath, 0o700);
      }

      return { root, installDir, profileDir, missionDir };
    };

    afterEach(() => {
      vi.restoreAllMocks();
      while (tempDirs.length > 0) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
      }
    });

    it('enforces GUARD-04: returns 401 when unauthenticated', async () => {
      const inspectSpy = vi.spyOn(serverFsInspectorService, 'inspect');
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${defaultServerId}/validate-paths`,
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_TOKEN_MISSING_OR_INVALID');
      expect(inspectSpy).not.toHaveBeenCalled();
    });

    it('enforces GUARD-04: returns 403 for non-admin user without invoking filesystem inspector', async () => {
      const inspectSpy = vi.spyOn(serverFsInspectorService, 'inspect');
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${defaultServerId}/validate-paths`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
      expect(inspectSpy).not.toHaveBeenCalled();
    });

    it('enforces GUARD-05: returns 400 INVALID_UUID for malformed server id', async () => {
      const inspectSpy = vi.spyOn(serverFsInspectorService, 'inspect');
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/servers/not-a-uuid/validate-paths',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      expect(body.fieldErrors?.id?.code).toBe('INVALID_UUID');
      expect(inspectSpy).not.toHaveBeenCalled();
    });

    it('enforces GUARD-05: returns 404 SERVER_NOT_FOUND for unknown server UUID', async () => {
      const inspectSpy = vi.spyOn(serverFsInspectorService, 'inspect');
      const missingId = '123e4567-e89b-12d3-a456-426614174999';
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${missingId}/validate-paths`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_NOT_FOUND');
      expect(body.params).toEqual({ id: missingId });
      expect(inspectSpy).not.toHaveBeenCalled();
    });

    it('enforces GUARD-01: returns 400 VALIDATION_FAILED with fieldErrors for invalid draft body overrides without accessing filesystem', async () => {
      const inspectSpy = vi.spyOn(serverFsInspectorService, 'inspect');

      const traversalResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${defaultServerId}/validate-paths`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          installPath: 'C:\\DayZServer\\..\\Windows',
          profilePath: 'profiles\0evil',
          missionPath: '',
        },
      });

      expect(traversalResponse.statusCode).toBe(400);
      const traversalBody = traversalResponse.json();
      expect(apiErrorResponseSchema.safeParse(traversalBody).success).toBe(true);
      expect(traversalBody.errorCode).toBe('VALIDATION_FAILED');
      expect(traversalBody.fieldErrors?.installPath?.code).toBe('PATH_TRAVERSAL_FORBIDDEN');
      expect(traversalBody.fieldErrors?.profilePath?.code).toBe('PATH_NULL_BYTES_FORBIDDEN');
      expect(traversalBody.fieldErrors?.missionPath?.code).toBe('REQUIRED');
      expect(inspectSpy).not.toHaveBeenCalled();

      const nullBodyResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${defaultServerId}/validate-paths`,
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
        payload: 'null',
      });

      expect(nullBodyResponse.statusCode).toBe(400);
      expect(nullBodyResponse.json().errorCode).toBe('VALIDATION_FAILED');
      expect(inspectSpy).not.toHaveBeenCalled();
    });

    it('returns 200 with structured diagnostic issues when inspecting persisted DB paths with omitted or empty JSON body (zero DB mutations)', async () => {
      const beforeRow = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${defaultServerId}/validate-paths`,
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(validateServerPathsResponseSchema.safeParse(body).success).toBe(true);
      expect(body.serverId).toBe(defaultServerId);
      expect(body.valid).toBe(false);
      expect(body.paths.installPath.configuredPath).toBe(beforeRow!.installPath);
      expect(body.paths.profilePath.configuredPath).toBe(beforeRow!.profilePath);
      expect(body.paths.missionPath.configuredPath).toBe(beforeRow!.missionPath);
      expect(body.issues.length).toBeGreaterThan(0);

      const afterRow = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();
      expect(afterRow).toEqual(beforeRow);
    });

    it('returns 200 with discoveredMissions for draft path overrides and leaves persisted DB values unchanged (REQ-05)', async () => {
      const tempHost = createTempDayzHost();
      const beforeRow = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${defaultServerId}/validate-paths`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          installPath: tempHost.installDir,
          profilePath: 'profiles',
          missionPath: 'mpmissions\\dayzOffline.chernarusplus',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(validateServerPathsResponseSchema.safeParse(body).success).toBe(true);
      expect(body.serverId).toBe(defaultServerId);
      expect(body.valid).toBe(true);
      expect(body.issues).toEqual([]);
      expect(body.paths.installPath.resolvedPath).toBe(tempHost.installDir);
      expect(body.paths.profilePath.resolvedPath).toBe(tempHost.profileDir);
      expect(body.paths.missionPath.resolvedPath).toBe(tempHost.missionDir);
      expect(body.discoveredMissions).toEqual([
        {
          name: 'dayzOffline.chernarusplus',
          relativePath: 'mpmissions/dayzOffline.chernarusplus',
          resolvedPath: tempHost.missionDir,
          hasInitScript: true,
          hasEconomyDb: true,
        },
      ]);

      // Verify draft validation mutated zero persisted columns
      const afterRow = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();
      expect(afterRow).toEqual(beforeRow);
    });

    it('permits non-mutating path validation while server is active/running', async () => {
      const tempHost = createTempDayzHost();
      dbInstance.db
        .update(servers)
        .set({ status: 'running' })
        .where(eq(servers.id, defaultServerId))
        .run();

      try {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${defaultServerId}/validate-paths`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            installPath: tempHost.installDir,
            profilePath: 'profiles',
            missionPath: 'dayzOffline.chernarusplus',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.valid).toBe(true);
        expect(body.discoveredMissions).toHaveLength(1);
      } finally {
        dbInstance.db
          .update(servers)
          .set({ status: 'stopped' })
          .where(eq(servers.id, defaultServerId))
          .run();
      }
    });

    it('returns 200 with valid: false and PROFILE_PATH_NOT_RELATIVE when override profilePath is absolute (Option B)', async () => {
      const tempHost = createTempDayzHost();
      const beforeRow = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${defaultServerId}/validate-paths`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          installPath: tempHost.installDir,
          profilePath: tempHost.profileDir,
          missionPath: 'dayzOffline.chernarusplus',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(validateServerPathsResponseSchema.safeParse(body).success).toBe(true);
      expect(body.valid).toBe(false);
      expect(body.paths.profilePath.status).toBe('error');
      expect(body.paths.battleyePath.status).toBe('skipped');
      expect(body.issues).toContainEqual(
        expect.objectContaining({
          target: 'profilePath',
          code: 'PROFILE_PATH_NOT_RELATIVE',
        }),
      );

      const afterRow = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();
      expect(afterRow).toEqual(beforeRow);
    });

    it('defaults omitted profilePath to "profiles" even when the DB server row contains a legacy non-"profiles" value', async () => {
      const tempHost = createTempDayzHost();
      const beforeRow = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get()!;

      dbInstance.db
        .update(servers)
        .set({ profilePath: `${tempHost.installDir}\\profiles` })
        .where(eq(servers.id, defaultServerId))
        .run();

      try {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${defaultServerId}/validate-paths`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            installPath: tempHost.installDir,
            missionPath: 'mpmissions/dayzOffline.chernarusplus',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(validateServerPathsResponseSchema.safeParse(body).success).toBe(true);
        expect(body.valid).toBe(true);
        expect(body.paths.profilePath.configuredPath).toBe('profiles');
        expect(body.paths.profilePath.resolvedPath).toBe(
          path.join(tempHost.installDir, 'profiles'),
        );
        expect(body.paths.battleyePath.resolvedPath).toBe(
          path.join(tempHost.installDir, 'profiles', 'BattlEye'),
        );
      } finally {
        dbInstance.db
          .update(servers)
          .set({ profilePath: beforeRow.profilePath })
          .where(eq(servers.id, defaultServerId))
          .run();
      }
    });
  });

  describe('Vault secrets, creation resolution, BattlEye auto-sync & running guards', () => {
    const tempDirs: string[] = [];
    const createdIds: string[] = [];
    const HOLDER = { id: 'lock-holder-id', username: 'holder', displayName: 'Lock Holder' };
    const RCON = ['InitRcon', '12'].join('!');
    const OPERATOR_CFG = Buffer.from(
      'hostname = "Operator file";\r\npassword = "keep";\r\n// custom comment\r\nmaxPlayers = 12;\r\n',
      'utf8',
    );
    const beName = getBattlEyeConfigFilename(process.platform);

    const createInstallFixture = (withServerDz = true) => {
      const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dsm-route-vault-')));
      tempDirs.push(root);
      const installDir = path.join(root, 'DayZServer');
      fs.mkdirSync(path.join(installDir, 'mpmissions', 'dayzOffline.chernarusplus'), {
        recursive: true,
      });
      const cfgPath = path.join(installDir, 'serverDZ.cfg');
      if (withServerDz) {
        fs.writeFileSync(cfgPath, OPERATOR_CFG);
      }
      const bePath = path.join(installDir, 'profiles', 'BattlEye', beName);
      return { installDir, cfgPath, bePath };
    };

    const rowOf = (id: string) =>
      dbInstance.db.select().from(servers).where(eq(servers.id, id)).get();

    const patch = (id: string, payload: Record<string, unknown>) =>
      app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${id}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload,
      });

    const create = async (payload: Record<string, unknown>, omitDefaultPaths = false) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/servers',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: omitDefaultPaths
          ? payload
          : {
              profilePath: 'profiles',
              missionPath: 'mpmissions/dayzOffline.chernarusplus',
              ...payload,
            },
      });
      if (response.statusCode === 201) {
        createdIds.push(response.json().id);
      }
      return response;
    };

    beforeAll(() => {
      dbInstance.db
        .insert(users)
        .values({ ...HOLDER, passwordHash: 'x', role: 'admin', createdAt: new Date() })
        .run();
    });

    afterAll(() => {
      dbInstance.db.delete(users).where(eq(users.id, HOLDER.id)).run();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      for (const trigger of ['vanish_on_insert', 'vanish_on_update', 'start_during_save']) {
        dbInstance.sqlite.exec(`DROP TRIGGER IF EXISTS ${trigger}`);
      }
      while (createdIds.length > 0) {
        dbInstance.db.delete(servers).where(eq(servers.id, createdIds.pop()!)).run();
      }
      while (tempDirs.length > 0) {
        fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
      }
    });

    it('creates with encrypted RCON secret at rest, exposes decrypted rconPassword in detail, writes BattlEye, and never touches serverDZ.cfg', async () => {
      const { installDir, cfgPath, bePath } = createInstallFixture();

      const response = await create({
        name: 'Vault Sync Server',
        installPath: installDir,
        gamePort: 2802,
        queryPort: 28016,
        rconPort: 2810,
        rconIp: '127.0.0.1',
        maxPlayers: 88,
        rconPassword: RCON,
      });

      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created).toMatchObject({
        rconPassword: RCON,
        maxPlayers: 88,
        rconIp: '127.0.0.1',
      });
      expect(created).not.toHaveProperty('hasAdminPassword');
      expect(created).not.toHaveProperty('hasServerPassword');
      expect(fs.readFileSync(cfgPath).equals(OPERATOR_CFG)).toBe(true);
      expect(fs.readFileSync(bePath, 'utf8')).toBe(
        `RConPassword ${RCON}\nRConPort 2810\nRConIP 127.0.0.1\nRestrictRCon 0\n`,
      );

      const row = rowOf(created.id)!;
      expect(row.rconPassword).toBeNull();
      expect(row.rconPasswordEncrypted).toBeTruthy();
      expect(JSON.stringify(row)).not.toContain(RCON);
    });

    it('creates without RCON password without provisioning BattlEye or serverDZ.cfg', async () => {
      const { installDir, cfgPath } = createInstallFixture(false);
      const response = await create({
        name: 'No Rcon Server',
        installPath: installDir,
        gamePort: 2822,
        queryPort: 28216,
        rconPort: 2820,
      });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        rconPassword: null,
      });
      expect(response.json()).not.toHaveProperty('hasAdminPassword');
      expect(response.json()).not.toHaveProperty('hasServerPassword');
      expect(fs.existsSync(cfgPath)).toBe(false);
      expect(fs.existsSync(path.join(installDir, 'profiles'))).toBe(false);
    });

    it('resolves omitted POST fields with precedence: explicit > disk serverDZ.cfg > discovered init.c / free queryPort > defaults', async () => {
      const fixture1 = createInstallFixture();
      fs.writeFileSync(
        fixture1.cfgPath,
        'hostname = "Disk";\nmaxPlayers = 42;\nsteamQueryPort = 27055;\nclass Missions { class DayZ { template = "dayzOffline.enoch"; }; };\n',
      );
      const fromDisk = await create(
        {
          name: 'Disk Defaults Server',
          installPath: fixture1.installDir,
          gamePort: 2912,
          rconPort: 2910,
        },
        true,
      );
      expect(fromDisk.statusCode).toBe(201);
      expect(fromDisk.json()).toMatchObject({
        profilePath: 'profiles',
        missionPath: 'mpmissions/dayzOffline.enoch',
        queryPort: 27055,
        maxPlayers: 42,
      });

      const fixture2 = createInstallFixture();
      fs.writeFileSync(
        fixture2.cfgPath,
        'hostname = "Disk";\nmaxPlayers = 42;\nsteamQueryPort = 27056;\nclass Missions { class DayZ { template = "dayzOffline.enoch"; }; };\n',
      );
      const explicitOverride = await create(
        {
          name: 'Explicit Override Server',
          installPath: fixture2.installDir,
          profilePath: 'customProfiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
          gamePort: 2922,
          queryPort: 27060,
          rconPort: 2920,
          maxPlayers: 99,
        },
        true,
      );
      expect(explicitOverride.statusCode).toBe(201);
      expect(explicitOverride.json()).toMatchObject({
        profilePath: 'customProfiles',
        missionPath: 'mpmissions/dayzOffline.chernarusplus',
        queryPort: 27060,
        maxPlayers: 99,
      });

      const fixture3 = createInstallFixture(false);
      fs.mkdirSync(path.join(fixture3.installDir, 'mpmissions', 'alpha.sakhal'), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(fixture3.installDir, 'mpmissions', 'alpha.sakhal', 'init.c'),
        'void main() {}',
      );
      const discovered = await create(
        {
          name: 'Discovered Mission Server',
          installPath: fixture3.installDir,
          gamePort: 2932,
          rconPort: 2930,
        },
        true,
      );
      expect(discovered.statusCode).toBe(201);
      expect(discovered.json()).toMatchObject({
        profilePath: 'profiles',
        missionPath: 'mpmissions/alpha.sakhal',
        maxPlayers: 60,
      });
      expect(discovered.json().queryPort).toBeGreaterThanOrEqual(27016);
      expect(discovered.json().queryPort).not.toBe(27016);

      const fixture4 = createInstallFixture();
      fs.writeFileSync(fixture4.cfgPath, 'steamQueryPort = 2942;\nmaxPlayers = 30;\n');
      const selfCollide = await create(
        {
          name: 'Disk Port Collides Self',
          installPath: fixture4.installDir,
          gamePort: 2942,
          rconPort: 2940,
        },
        true,
      );
      expect(selfCollide.statusCode).toBe(409);
      expect(selfCollide.json().errorCode).toBe('SERVER_PORT_COLLISION');
      expect(selfCollide.json().fieldErrors?.queryPort?.code).toBe('SERVER_PORT_COLLISION');
    });

    it('PATCH keeps serverDZ.cfg byte-identical and regenerates BattlEye only when RCON settings change', async () => {
      const { installDir, cfgPath, bePath } = createInstallFixture();
      const id = (
        await create({
          name: 'Patch Target',
          installPath: installDir,
          gamePort: 2832,
          queryPort: 28316,
          rconPort: 2830,
          rconPassword: RCON,
        })
      ).json().id;

      const expectPatchSync = async (payload: Record<string, unknown>, regenerated: boolean) => {
        fs.rmSync(bePath, { force: true });
        const response = await patch(id, payload);
        expect(response.statusCode, JSON.stringify(payload)).toBe(200);
        expect(fs.existsSync(bePath), JSON.stringify(payload)).toBe(regenerated);
        expect(fs.readFileSync(cfgPath).equals(OPERATOR_CFG)).toBe(true);
        return response.json();
      };

      await expectPatchSync({ description: 'metadata only', launchParameters: '-doLogs' }, false);
      const nextMissionPath = 'mpmissions/dayzOffline.enoch';
      const missionUpdated = await expectPatchSync({ missionPath: nextMissionPath }, false);
      expect(missionUpdated.missionPath).toBe(nextMissionPath);
      expect(rowOf(id)!.missionPath).toBe(nextMissionPath);
      await expectPatchSync({ rconPort: 2830 }, false);
      await expectPatchSync({ rconIp: '127.0.0.1' }, false);
      await expectPatchSync({ rconPort: 2899 }, true);
      expect(fs.readFileSync(bePath, 'utf8')).toContain('RConPort 2899');
      await expectPatchSync({ rconIp: '0.0.0.0' }, true);
      expect(fs.readFileSync(bePath, 'utf8')).toContain('RConIP 0.0.0.0');
      const rotatedRcon = ['Rotated', '77'].join('!');
      const rotated = await expectPatchSync({ rconPassword: rotatedRcon }, true);
      expect(rotated.rconPassword).toBe(rotatedRcon);
      expect(fs.readFileSync(bePath, 'utf8')).toContain(`RConPassword ${rotatedRcon}`);

      const row = rowOf(id)!;
      expect(row.launchParameters).toBe('-doLogs');
      expect(row.queryPort).toBe(28316);
      expect(row.maxPlayers).toBe(12);

      const invalid = await patch(id, { rconIp: 'invalid-ip' });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json().fieldErrors?.rconIp?.code).toBe('INVALID_VALUE');

      const clearedEmpty = await patch(id, { rconPassword: '' });
      expect(clearedEmpty.statusCode).toBe(400);
      expect(clearedEmpty.json().fieldErrors?.rconPassword).toBeDefined();

      const clearedNull = await patch(id, { rconPassword: null });
      expect(clearedNull.statusCode).toBe(200);
      expect(clearedNull.json()).toMatchObject({ rconPassword: null });
      expect(fs.readFileSync(cfgPath).equals(OPERATOR_CFG)).toBe(true);
    });

    it('reports rconPassword for legacy plaintext RCON rows and refuses GET with 500 VAULT_KEY_UNAVAILABLE if vault fails', async () => {
      const { installDir } = createInstallFixture(false);
      const id = (
        await create({
          name: 'Legacy Rcon',
          installPath: installDir,
          gamePort: 2842,
          queryPort: 28416,
          rconPort: 2840,
        })
      ).json().id;
      const legacyPlain = ['legacy', 'plain'].join('-');
      dbInstance.db
        .update(servers)
        .set({ rconPassword: legacyPlain })
        .where(eq(servers.id, id))
        .run();

      const legacyRes = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(legacyRes.statusCode).toBe(200);
      expect(legacyRes.json()).toMatchObject({
        rconPassword: legacyPlain,
      });

      const encryptedRcon = ['Encrypted', '55'].join('!');
      const encryptedRes = await patch(id, { rconPassword: encryptedRcon });
      expect(encryptedRes.statusCode).toBe(200);

      vi.mocked(databaseModule.verifyVaultKey).mockReturnValueOnce(false);
      const vaultFailRes = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(vaultFailRes.statusCode).toBe(500);
      expect(vaultFailRes.json().errorCode).toBe('VAULT_KEY_UNAVAILABLE');
    });

    it('allows PATCH on RCON and server metadata while a serverDZ edit lock is active', async () => {
      const { installDir, cfgPath, bePath } = createInstallFixture();
      const id = (
        await create({
          name: 'Unlocked Rcon Config',
          installPath: installDir,
          gamePort: 2852,
          queryPort: 28516,
          rconPort: 2850,
          rconPassword: RCON,
        })
      ).json().id;
      dbInstance.db
        .insert(configEditLocks)
        .values({
          serverId: id,
          fileKind: 'server_dz',
          sessionToken: '00000000-0000-4000-a000-0000000000ff',
          userId: HOLDER.id,
          acquiredAt: new Date(Date.now() - 1_000),
          expiresAt: new Date(Date.now() + CONFIG_EDIT_LOCK_TTL_MS),
        })
        .run();

      fs.rmSync(bePath);
      const rconChange = await patch(id, { rconPassword: 'Rotated!88', description: 'allowed' });
      expect(rconChange.statusCode).toBe(200);
      expect(rconChange.json()).toMatchObject({
        rconPassword: 'Rotated!88',
        description: 'allowed',
      });
      expect(fs.readFileSync(bePath, 'utf8')).toContain('RConPassword Rotated!88');
      expect(fs.readFileSync(cfgPath).equals(OPERATOR_CFG)).toBe(true);
    });

    it('enforces the running guard on RCON and file-adjacent keys while allowing unchanged values and metadata', async () => {
      const { installDir } = createInstallFixture(false);
      const id = (
        await create({
          name: 'Running Guard',
          installPath: installDir,
          gamePort: 2862,
          queryPort: 28616,
          rconPort: 2860,
        })
      ).json().id;
      dbInstance.db.update(servers).set({ status: 'running' }).where(eq(servers.id, id)).run();
      const before = rowOf(id);

      for (const payload of [
        { rconPassword: 'NewSecret!99' },
        { rconPassword: null },
        { rconIp: '0.0.0.0' },
        { name: 'Renamed While Running' },
        { launchParameters: '-doLogs' },
      ]) {
        const response = await patch(id, payload);
        expect(response.statusCode, JSON.stringify(payload)).toBe(409);
        expect(response.json().errorCode).toBe('SERVER_RUNNING_CONFIG_LOCKED');
      }
      expect(rowOf(id)).toEqual(before);

      const unchanged = await patch(id, {
        rconIp: '127.0.0.1',
        name: 'Running Guard',
        description: 'live note',
      });
      expect(unchanged.statusCode).toBe(200);
      expect(unchanged.json().description).toBe('live note');
    });

    it('no longer exposes POST /:id/sync-config', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${defaultServerId}/sync-config`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(404);
    });

    it('handles vault errors on create and patch', async () => {
      const payload = {
        installPath: 'C:\\MissingInstall',
        gamePort: 2902,
        queryPort: 29016,
        rconPort: 2910,
        rconPassword: 'ValidPass!1',
      };
      vi.mocked(databaseModule.verifyVaultKey).mockReturnValueOnce(false);
      const badVerify = await create({ ...payload, name: 'Vault Verify Fail' });
      expect(badVerify.statusCode).toBe(500);
      expect(badVerify.json().errorCode).toBe('VAULT_KEY_UNAVAILABLE');

      vi.mocked(databaseModule.resolveVaultKey).mockImplementationOnce(() => {
        throw new Error('vault unreadable');
      });
      const unreadable = await create({ ...payload, name: 'Vault Unreadable' });
      expect(unreadable.statusCode).toBe(500);
      expect(unreadable.json().errorCode).toBe('VAULT_KEY_UNAVAILABLE');
      expect(
        dbInstance.db.select().from(servers).where(eq(servers.name, 'Vault Unreadable')).get(),
      ).toBeUndefined();

      const before = rowOf(defaultServerId);
      vi.mocked(databaseModule.encryptVaultSecret).mockImplementationOnce(() => {
        throw new Error('cipher error');
      });
      const encryptFail = await patch(defaultServerId, { rconPassword: 'ValidPass!1' });
      expect(encryptFail.statusCode).toBe(500);
      expect(encryptFail.json().errorCode).toBe('VAULT_ENCRYPTION_FAILED');
      expect(rowOf(defaultServerId)).toEqual(before);
    });

    it('skips BattlEye auto-sync when stored credentials cannot be decrypted', async () => {
      const { installDir, bePath } = createInstallFixture(false);
      const id = (
        await create({
          name: 'Decrypt Fail',
          installPath: installDir,
          gamePort: 2872,
          queryPort: 28716,
          rconPort: 2870,
          rconPassword: RCON,
        })
      ).json().id;
      fs.rmSync(bePath);

      vi.mocked(databaseModule.decryptVaultSecret).mockImplementationOnce(() => {
        throw new Error('bad tag');
      });
      const response = await patch(id, { rconPort: 2879 });
      expect(response.statusCode).toBe(200);
      expect(response.json().rconPort).toBe(2879);
      expect(fs.existsSync(bePath)).toBe(false);
    });

    it('skips BattlEye auto-sync when the server became active while saving', async () => {
      const { installDir, bePath } = createInstallFixture(false);
      const id = (
        await create({
          name: 'Started Mid Save',
          installPath: installDir,
          gamePort: 2882,
          queryPort: 28816,
          rconPort: 2880,
          rconPassword: RCON,
        })
      ).json().id;
      fs.rmSync(bePath);
      dbInstance.sqlite.exec(
        `CREATE TRIGGER start_during_save AFTER UPDATE OF rcon_port ON servers BEGIN UPDATE servers SET status = 'starting' WHERE id = NEW.id; END;`,
      );

      const response = await patch(id, { rconPort: 2889 });
      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe('starting');
      expect(fs.existsSync(bePath)).toBe(false);
    });

    it('returns 500 when the saved row cannot be read back', async () => {
      dbInstance.sqlite.exec(
        `CREATE TRIGGER vanish_on_insert AFTER INSERT ON servers WHEN NEW.name = 'Vanishing' BEGIN DELETE FROM servers WHERE id = NEW.id; END;`,
      );
      const created = await create({
        name: 'Vanishing',
        installPath: 'C:\\Nowhere',
        gamePort: 2892,
        queryPort: 28916,
        rconPort: 2890,
      });
      expect(created.statusCode).toBe(500);
      expect(created.json().errorCode).toBe('INTERNAL_SERVER_ERROR');

      const { installDir } = createInstallFixture(false);
      const id = (
        await create({
          name: 'Vanish On Update',
          installPath: installDir,
          gamePort: 2942,
          queryPort: 29416,
          rconPort: 2940,
        })
      ).json().id;
      dbInstance.sqlite.exec(
        `CREATE TRIGGER vanish_on_update AFTER UPDATE OF description ON servers WHEN NEW.description = 'gone' BEGIN DELETE FROM servers WHERE id = NEW.id; END;`,
      );
      const updated = await patch(id, { description: 'gone' });
      expect(updated.statusCode).toBe(500);
      expect(updated.json().errorCode).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('DELETE /api/v1/servers/:id', () => {
    let secondServerId: string;

    beforeAll(async () => {
      const s = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.name, 'Livonia Hardcore'))
        .get();
      secondServerId = s!.id;
    });

    it('returns 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
    });

    it('returns 400 for malformed non-UUID server id', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/servers/malformed-id',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('VALIDATION_FAILED');
      expect(body.fieldErrors?.id?.code).toBe('INVALID_UUID');
      expect(body.message).toContain('Must be a valid UUID');
    });

    it('returns 404 for unknown server', async () => {
      const unknownId = '123e4567-e89b-12d3-a456-426614174999';
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/servers/${unknownId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_NOT_FOUND');
      expect(body.params).toEqual({ id: unknownId });
    });

    it('enforces GUARD-SRV-01: returns 409 if server is running', async () => {
      dbInstance.db
        .update(servers)
        .set({ status: 'running' })
        .where(eq(servers.id, secondServerId))
        .run();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
      expect(body.errorCode).toBe('SERVER_RUNNING_DELETE_LOCKED');
      expect(body.params).toEqual({
        id: secondServerId,
        name: 'Livonia Hardcore',
        status: 'running',
      });
      expect(body.message).toContain('Cannot delete server while it is running');

      const stillExists = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, secondServerId))
        .get();
      expect(stillExists).toBeDefined();

      dbInstance.db
        .update(servers)
        .set({ status: 'stopped' })
        .where(eq(servers.id, secondServerId))
        .run();
    });

    it.each(['starting', 'stopping'] as const)(
      'enforces GUARD-SRV-01: returns 409 if server is %s',
      async activeStatus => {
        dbInstance.db
          .update(servers)
          .set({ status: activeStatus })
          .where(eq(servers.id, secondServerId))
          .run();

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v1/servers/${secondServerId}`,
          headers: { authorization: `Bearer ${adminToken}` },
        });

        expect(response.statusCode).toBe(409);
        const body = response.json();
        expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
        expect(body.errorCode).toBe('SERVER_RUNNING_DELETE_LOCKED');
        expect(body.params).toEqual({
          id: secondServerId,
          name: 'Livonia Hardcore',
          status: activeStatus,
        });

        const stillExists = dbInstance.db
          .select()
          .from(servers)
          .where(eq(servers.id, secondServerId))
          .get();
        expect(stillExists).toBeDefined();

        dbInstance.db
          .update(servers)
          .set({ status: 'stopped' })
          .where(eq(servers.id, secondServerId))
          .run();
      },
    );

    it('allows deleting a server when status is failed (returns 200)', async () => {
      const failedServerId = '33333333-3333-4333-a333-333333333333';
      const now = new Date();
      dbInstance.db
        .insert(servers)
        .values({
          id: failedServerId,
          name: 'Temporary Failed Server',
          description: 'Server in failed state',
          isDefault: false,
          status: 'failed',
          gamePort: 2602,
          queryPort: 27018,
          rconPort: 2312,
          rconPassword: 'test-rcon-password',
          installPath: 'C:\\DayZFailedServer',
          profilePath: 'profiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/servers/${failedServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      const deletedCheck = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, failedServerId))
        .get();
      expect(deletedCheck).toBeUndefined();
    });

    it('tolerates Content-Type: application/json with empty body on DELETE', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/servers/${secondServerId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      // Re-seed secondServerId for subsequent deletion test
      dbInstance.db
        .insert(servers)
        .values({
          id: secondServerId,
          name: 'Livonia Hardcore',
          description: 'Hardcore survival',
          isDefault: false,
          status: 'stopped',
          gamePort: 2402,
          queryPort: 27017,
          rconPort: 2311,
          rconPassword: 'test-rcon-password',
          installPath: 'C:\\DayZServer2',
          profilePath: 'profiles',
          missionPath: 'mpmissions/dayzOffline.enoch',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .run();
    });

    it('promotes next remaining server to default when deleting a default server with siblings', async () => {
      // Mark secondServerId as default
      dbInstance.db
        .update(servers)
        .set({ isDefault: true })
        .where(eq(servers.id, secondServerId))
        .run();
      dbInstance.db
        .update(servers)
        .set({ isDefault: false })
        .where(eq(servers.id, defaultServerId))
        .run();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      // Verify secondServerId is deleted
      const checkDeleted = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, secondServerId))
        .get();
      expect(checkDeleted).toBeUndefined();

      // Verify defaultServerId was automatically promoted to default
      const checkDefault = dbInstance.db
        .select()
        .from(servers)
        .where(eq(servers.id, defaultServerId))
        .get();
      expect(checkDefault).toBeDefined();
      expect(checkDefault!.isDefault).toBe(true);
    });

    it('allows deleting the sole remaining server, successfully returning 200 and leaving 0 servers in database', async () => {
      // Now only defaultServerId remains in database
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/servers/${defaultServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);

      const allRemaining = dbInstance.db.select().from(servers).all();
      expect(allRemaining).toHaveLength(0);
    });
  });
});
