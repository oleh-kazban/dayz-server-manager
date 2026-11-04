import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type DatabaseInstance, initDatabase, servers } from '@dsm/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';

describe('Servers Routes (/api/v1/servers)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let adminToken: string;
  let viewerToken: string;
  let defaultServerId: string;

  beforeAll(async () => {
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
  });

  describe('GET /api/v1/servers', () => {
    it('returns 401 when token is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/servers',
      });
      expect(response.statusCode).toBe(401);
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
      expect(response.json().message).toContain('Must be a valid UUID');
    });

    it('returns 404 for non-existent server', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/servers/123e4567-e89b-12d3-a456-426614174999',
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(response.statusCode).toBe(404);
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
      expect(responseTraversal.json().message).toContain('Path traversal');

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
      expect(responseNull.json().message).toContain('Null bytes are forbidden');
    });

    it('returns 409 when server name already exists', async () => {
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
    });

    it('returns 409 when port collides with an existing server on the host', async () => {
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
      expect(response.json().message).toContain('collides with existing server');
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
    });

    it('returns 400 for malformed non-UUID server id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/servers/malformed-id',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'Ghost' },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().message).toContain('Must be a valid UUID');
    });

    it('returns 404 for unknown server id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/servers/123e4567-e89b-12d3-a456-426614174999',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'Ghost' },
      });
      expect(response.statusCode).toBe(404);
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
      expect(response.json().message).toContain('Cannot alter network ports');

      // Test path alteration while running
      const pathResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { installPath: '/new/path' },
      });
      expect(pathResponse.statusCode).toBe(409);

      // Reset to stopped
      dbInstance.db
        .update(servers)
        .set({ status: 'stopped' })
        .where(eq(servers.id, secondServerId))
        .run();
    });

    it('returns 409 if renaming to an existing server name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'DayZ (Local)' },
      });
      expect(response.statusCode).toBe(409);
    });

    it('returns 409 if port update collides with another server', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { gamePort: 2302 }, // Collides with defaultServerId
      });
      expect(response.statusCode).toBe(409);
    });

    it('returns 400 if updating port causes intra-server collision', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${secondServerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { gamePort: 27017 }, // queryPort is already 27017!
      });
      expect(response.statusCode).toBe(400);
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
    });

    it('returns 400 for malformed non-UUID server id', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/servers/malformed-id',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().message).toContain('Must be a valid UUID');
    });

    it('returns 404 for unknown server', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/servers/123e4567-e89b-12d3-a456-426614174999',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(404);
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
      expect(response.json().message).toContain('Cannot delete server while it is running');

      dbInstance.db
        .update(servers)
        .set({ status: 'stopped' })
        .where(eq(servers.id, secondServerId))
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
