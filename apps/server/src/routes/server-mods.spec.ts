import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  apiErrorResponseSchema,
  importServerModsResponseSchema,
  MOD_IMPORT_MODE,
  MOD_LOAD_TARGET,
  MOD_SOURCE_TYPE,
  modPresetSchema,
  serverModsListResponseSchema,
} from '@aegis/api-contracts';
import { type DatabaseInstance, initDatabase, serverMods, servers } from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { SteamWorkshopError, steamWorkshopService } from '../services/steam/steam-workshop.service';

import { compileModLaunchParams, computeModSyncStatus } from './server-mods';

describe('Server Mods Helpers & Routes (/api/v1/servers/:id/mods)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let adminToken: string;
  let setupToken: string;

  const serverAId = '11111111-1111-4111-a111-111111111111';
  const serverBId = '22222222-2222-4222-8222-222222222222';
  const missingServerId = '99999999-9999-4999-8999-999999999999';

  beforeAll(async () => {
    dbInstance = initDatabase({ dbPath: ':memory:' });
    const config = loadEnv({
      SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
      LOG_LEVEL: 'silent',
    });

    app = buildApp({ config, db: dbInstance });
    await app.ready();

    adminToken = app.jwt.sign(
      { sub: 'admin-id', role: 'admin', type: 'access' },
      { expiresIn: '15m' },
    );
    setupToken = app.jwt.sign(
      { sub: 'setup-id', role: 'setup', type: 'access' },
      { expiresIn: '15m' },
    );

    const now = new Date();
    dbInstance.db
      .insert(servers)
      .values([
        {
          id: serverAId,
          name: 'DayZ Chernarus',
          status: 'stopped',
          installPath: '/opt/dayz/a',
          profilePath: '/opt/dayz/a/profiles',
          missionPath: 'mpmissions/dayzOffline.chernarusplus',
          gamePort: 2302,
          queryPort: 27016,
          rconPort: 2310,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: serverBId,
          name: 'DayZ Namalsk',
          status: 'stopped',
          installPath: '/opt/dayz/b',
          profilePath: '/opt/dayz/b/profiles',
          missionPath: 'mpmissions/dayzOffline.namalsk',
          gamePort: 2402,
          queryPort: 27018,
          rconPort: 2410,
          isDefault: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .run();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    dbInstance.db.delete(serverMods).run();
    dbInstance.db.update(servers).set({ status: 'stopped' }).where(eq(servers.id, serverAId)).run();
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  describe('Pure Domain Helpers', () => {
    it('computes sync status across local, not_synced, update_available, and up_to_date', () => {
      const t1 = new Date('2026-11-10T10:00:00.000Z');
      const t2 = new Date('2026-11-10T12:00:00.000Z');

      expect(
        computeModSyncStatus({
          sourceType: MOD_SOURCE_TYPE.LOCAL,
          remoteUpdatedAt: t2,
          syncedWorkshopUpdatedAt: null,
        }),
      ).toBe('local');

      expect(
        computeModSyncStatus({
          sourceType: MOD_SOURCE_TYPE.WORKSHOP,
          remoteUpdatedAt: t2,
          syncedWorkshopUpdatedAt: null,
        }),
      ).toBe('not_synced');

      expect(
        computeModSyncStatus({
          sourceType: MOD_SOURCE_TYPE.WORKSHOP,
          remoteUpdatedAt: t2,
          syncedWorkshopUpdatedAt: t1,
        }),
      ).toBe('update_available');

      expect(
        computeModSyncStatus({
          sourceType: MOD_SOURCE_TYPE.WORKSHOP,
          remoteUpdatedAt: t1,
          syncedWorkshopUpdatedAt: t1,
        }),
      ).toBe('up_to_date');
    });

    it('compiles -mod= and -serverMod= in loadOrder, skipping disabled, client_optional, and empty folders', () => {
      const preview = compileModLaunchParams([
        {
          enabled: true,
          loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
          folderName: '@ZLast',
          loadOrder: 4,
        },
        {
          enabled: true,
          loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
          folderName: '@CF',
          loadOrder: 0,
        },
        {
          enabled: false,
          loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
          folderName: '@DisabledMod',
          loadOrder: 1,
        },
        {
          enabled: true,
          loadTarget: MOD_LOAD_TARGET.SERVER_ONLY,
          folderName: '@ServerTools',
          loadOrder: 2,
        },
        {
          enabled: true,
          loadTarget: MOD_LOAD_TARGET.CLIENT_OPTIONAL,
          folderName: '@OptionalGraphics',
          loadOrder: 3,
        },
        {
          enabled: true,
          loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
          folderName: '   ',
          loadOrder: 5,
        },
      ]);

      expect(preview).toEqual({
        modFlag: '-mod=@CF;@ZLast',
        serverModFlag: '-serverMod=@ServerTools',
        combinedArgs: ['-mod=@CF;@ZLast', '-serverMod=@ServerTools'],
        missingFolderCount: 1,
      });
    });
  });

  describe('RBAC & GUARD-MOD-01 (Ownership & Validation)', () => {
    it('enforces authentication and admin-only mutations and denies the setup role on reads', async () => {
      const unauth = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${serverAId}/mods`,
      });
      expect(unauth.statusCode).toBe(401);

      const setupGet = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${setupToken}` },
      });
      expect(setupGet.statusCode).toBe(403);
      expect(setupGet.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');

      const setupExport = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${serverAId}/mods/export-preset`,
        headers: { authorization: `Bearer ${setupToken}` },
      });
      expect(setupExport.statusCode).toBe(403);

      const roleless = app.jwt.sign({ sub: 'roleless', type: 'access' });
      const unknown = app.jwt.sign({ sub: 'unknown', role: 'viewer', type: 'access' });
      for (const token of [roleless, unknown]) {
        const denied = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods`,
          headers: { authorization: `Bearer ${token}` },
          payload: { sourceType: 'local', name: 'Local Mod', folderName: '@Local' },
        });
        expect(denied.statusCode).toBe(403);
        expect(denied.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
      }

      const setupPost = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${setupToken}` },
        payload: {
          sourceType: 'local',
          name: 'Local Mod',
          folderName: '@Local',
        },
      });
      expect(setupPost.statusCode).toBe(403);
      expect(setupPost.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
      expect(setupPost.json().message).toBe(
        'Administrator privileges are required to perform this action.',
      );
    });

    it('rejects invalid UUIDs, unknown servers, and cross-server mod IDs (IDOR)', async () => {
      const badServer = await app.inject({
        method: 'GET',
        url: '/api/v1/servers/not-a-uuid/mods',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(badServer.statusCode).toBe(400);
      expect(badServer.json().errorCode).toBe('VALIDATION_FAILED');

      const unknownServer = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${missingServerId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(unknownServer.statusCode).toBe(404);
      expect(unknownServer.json().errorCode).toBe('SERVER_NOT_FOUND');

      // Seed mod on serverB and try mutating it via serverA URL
      const addB = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverBId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceType: 'local',
          name: 'Namalsk Scripts',
          folderName: '@NamalskScripts',
        },
      });
      expect(addB.statusCode).toBe(201);
      const modOnB = addB.json();

      const idorPatch = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${serverAId}/mods/${modOnB.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'Hijacked' },
      });
      expect(idorPatch.statusCode).toBe(404);
      expect(idorPatch.json().errorCode).toBe('MOD_NOT_FOUND');

      const idorDelete = await app.inject({
        method: 'DELETE',
        url: `/api/v1/servers/${serverAId}/mods/${modOnB.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(idorDelete.statusCode).toBe(404);
      expect(idorDelete.json().errorCode).toBe('MOD_NOT_FOUND');

      // Verify zero mutation on serverB's mod
      const checkB = dbInstance.db
        .select()
        .from(serverMods)
        .where(eq(serverMods.id, modOnB.id))
        .get();
      expect(checkB?.name).toBe('Namalsk Scripts');
    });
  });

  describe('GUARD-MOD-02: Running-Server Configuration Lock', () => {
    it.each(['running', 'starting', 'stopping'] as const)(
      'blocks all mod mutations with 409 SERVER_RUNNING_CONFIG_LOCKED when server is %s while allowing GET and check-updates',
      async activeStatus => {
        const addRes = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            sourceType: 'workshop',
            workshopId: '1559212036',
            name: 'CF',
            folderName: '@CF',
          },
        });
        expect(addRes.statusCode).toBe(201);
        const mod = addRes.json();

        dbInstance.db
          .update(servers)
          .set({ status: activeStatus })
          .where(eq(servers.id, serverAId))
          .run();

        const mutations = [
          app.inject({
            method: 'POST',
            url: `/api/v1/servers/${serverAId}/mods`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { sourceType: 'local', name: 'Blocked', folderName: '@Blocked' },
          }),
          app.inject({
            method: 'POST',
            url: `/api/v1/servers/${serverAId}/mods/batch`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: {
              mods: [{ workshopId: '1564026768', name: 'COT', folderName: '@COT' }],
            },
          }),
          app.inject({
            method: 'PATCH',
            url: `/api/v1/servers/${serverAId}/mods/${mod.id}`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { enabled: false },
          }),
          app.inject({
            method: 'DELETE',
            url: `/api/v1/servers/${serverAId}/mods/${mod.id}`,
            headers: { authorization: `Bearer ${adminToken}` },
          }),
          app.inject({
            method: 'PUT',
            url: `/api/v1/servers/${serverAId}/mods/reorder`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { modIds: [mod.id] },
          }),
        ];

        const responses = await Promise.all(mutations);
        for (const res of responses) {
          expect(res.statusCode).toBe(409);
          const body = res.json();
          expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
          expect(body.errorCode).toBe('SERVER_RUNNING_CONFIG_LOCKED');
          expect(body.params).toEqual({
            id: serverAId,
            name: 'DayZ Chernarus',
            status: activeStatus,
          });
        }

        // Assert zero DB mutation occurred
        const rowsAfter = dbInstance.db
          .select()
          .from(serverMods)
          .where(eq(serverMods.serverId, serverAId))
          .all();
        expect(rowsAfter).toHaveLength(1);
        expect(rowsAfter[0].enabled).toBe(true);

        // GET & check-updates remain permitted while running
        const getRes = await app.inject({
          method: 'GET',
          url: `/api/v1/servers/${serverAId}/mods`,
          headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(getRes.statusCode).toBe(200);

        const remoteTime = new Date('2026-11-10T18:00:00.000Z');
        vi.spyOn(steamWorkshopService, 'fetchPublishedFileMetadataMap').mockResolvedValue(
          new Map([['1559212036', { sizeBytes: 4096, remoteUpdatedAt: remoteTime }]]),
        );

        const checkRes = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/check-updates`,
          headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(checkRes.statusCode).toBe(200);
        expect(checkRes.json().mods[0].sizeBytes).toBe(4096);
      },
    );
  });

  describe('Add, Batch Import, Duplicate Guards (GUARD-MOD-03), Update & Delete Re-indexing', () => {
    it('supports markAsInstalled vs Not synced, local mods, and single-item duplicate refusals', async () => {
      const wsNotSynced = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceType: 'workshop',
          workshopId: '1559212036',
          name: 'CF',
          folderName: '@CF',
          markAsInstalled: false,
        },
      });
      expect(wsNotSynced.statusCode).toBe(201);
      expect(wsNotSynced.json().syncStatus).toBe('not_synced');
      expect(wsNotSynced.json().workshopUrl).toBe(
        'https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036',
      );

      const wsInstalled = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceType: 'workshop',
          workshopId: '1564026768',
          name: 'Community Online Tools',
          folderName: '@Community-Online-Tools',
          remoteUpdatedAt: '2026-11-10T10:00:00.000Z',
          markAsInstalled: true,
        },
      });
      expect(wsInstalled.statusCode).toBe(201);
      expect(wsInstalled.json().syncStatus).toBe('up_to_date');
      expect(wsInstalled.json().loadOrder).toBe(1);

      const localMod = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceType: 'local',
          name: 'Server Scripts',
          folderName: '@ServerScripts',
          loadTarget: 'server_only',
        },
      });
      expect(localMod.statusCode).toBe(201);
      expect(localMod.json().syncStatus).toBe('local');
      expect(localMod.json().workshopId).toBeNull();
      expect(localMod.json().workshopUrl).toBeNull();
      expect(localMod.json().loadOrder).toBe(2);

      // Duplicate workshopId rejected with 409 MOD_ALREADY_INSTALLED
      const dupWs = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceType: 'workshop',
          workshopId: '1559212036',
          name: 'CF Duplicate',
          folderName: '@CF_Other',
        },
      });
      expect(dupWs.statusCode).toBe(409);
      expect(dupWs.json().errorCode).toBe('MOD_ALREADY_INSTALLED');

      // Case-insensitive duplicate folderName rejected with 409 MOD_ALREADY_INSTALLED
      const dupFolder = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceType: 'local',
          name: 'Another Local',
          folderName: '@serverscripts',
        },
      });
      expect(dupFolder.statusCode).toBe(409);
      expect(dupFolder.json().errorCode).toBe('MOD_ALREADY_INSTALLED');
      expect(dupFolder.json().fieldErrors?.folderName?.code).toBe('MOD_ALREADY_INSTALLED');

      // Verify zero extra rows inserted on refusals
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(listRes.json().mods).toHaveLength(3);
    });

    it('batch imports atomically, skips duplicate workshopIds, and preserves contiguous loadOrder', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceType: 'workshop',
          workshopId: '1559212036',
          name: 'CF',
          folderName: '@CF',
        },
      });

      const batchRes = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods/batch`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          markAsInstalled: true,
          mods: [
            { workshopId: '1559212036', name: 'CF Duplicate', folderName: '@CF' },
            { workshopId: '1564026768', name: 'COT', folderName: '@COT' },
            { workshopId: '2545327648', name: 'Dabs', folderName: '@CF' }, // folder collision disambiguated
          ],
        },
      });

      expect(batchRes.statusCode).toBe(201);
      const body = batchRes.json();
      expect(body.skippedCount).toBe(1);
      expect(body.added).toHaveLength(2);
      expect(body.added.every((m: { syncStatus: string }) => m.syncStatus === 'up_to_date')).toBe(
        true,
      );
      expect(body.mods).toHaveLength(3);
      expect(body.mods.map((m: { loadOrder: number }) => m.loadOrder)).toEqual([0, 1, 2]);
      expect(body.added[1].folderName).toBe('@CF_2545327648');

      // Per-item markAsInstalled: false overrides top-level markAsInstalled: true
      const overrideRes = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods/batch`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          markAsInstalled: true,
          mods: [
            {
              workshopId: '999999999',
              name: 'Override Not Synced',
              folderName: '@Override',
              markAsInstalled: false,
            },
          ],
        },
      });
      expect(overrideRes.statusCode).toBe(201);
      expect(overrideRes.json().added[0].syncStatus).toBe('not_synced');
    });

    it('updates mod fields, rejects folder collision on PATCH, and re-indexes loadOrder 0..n-1 on DELETE', async () => {
      const batchRes = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods/batch`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          mods: [
            { workshopId: '100', name: 'Mod Zero', folderName: '@Zero' },
            { workshopId: '200', name: 'Mod One', folderName: '@One' },
            { workshopId: '300', name: 'Mod Two', folderName: '@Two' },
          ],
        },
      });
      const [m0, m1, m2] = batchRes.json().mods;

      // Folder collision on PATCH refused
      const collisionRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${serverAId}/mods/${m1.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { folderName: '@zero' },
      });
      expect(collisionRes.statusCode).toBe(409);
      expect(collisionRes.json().errorCode).toBe('MOD_ALREADY_INSTALLED');

      // Delete middle mod (loadOrder = 1)
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/api/v1/servers/${serverAId}/mods/${m1.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(delRes.statusCode).toBe(200);
      expect(delRes.json()).toEqual({ success: true });

      const listAfterDelete = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const remaining = listAfterDelete.json().mods;
      expect(remaining.map((m: { id: string; loadOrder: number }) => [m.id, m.loadOrder])).toEqual([
        [m0.id, 0],
        [m2.id, 1],
      ]);
    });
  });

  describe('GUARD-MOD-04 (Reorder) & REQ-05 (Update Detection + Mark Synced)', () => {
    it('reorders mods atomically and refuses invalid permutations with zero loadOrder mutation', async () => {
      const batchRes = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods/batch`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          mods: [
            { workshopId: '100', name: 'Mod A', folderName: '@A' },
            { workshopId: '200', name: 'Mod B', folderName: '@B', loadTarget: 'server_only' },
            { workshopId: '300', name: 'Mod C', folderName: '@C', enabled: false },
          ],
        },
      });
      const [mA, mB, mC] = batchRes.json().mods;

      // Refuses subset
      const missingRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/servers/${serverAId}/mods/reorder`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { modIds: [mA.id, mB.id] },
      });
      expect(missingRes.statusCode).toBe(400);
      expect(missingRes.json().errorCode).toBe('MOD_REORDER_INVALID');

      // Refuses duplicates
      const dupRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/servers/${serverAId}/mods/reorder`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { modIds: [mA.id, mA.id, mB.id] },
      });
      expect(dupRes.statusCode).toBe(400);
      expect(dupRes.json().errorCode).toBe('MOD_REORDER_INVALID');

      // Refuses foreign ID
      const foreignRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/servers/${serverAId}/mods/reorder`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { modIds: [mA.id, mB.id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'] },
      });
      expect(foreignRes.statusCode).toBe(400);
      expect(foreignRes.json().errorCode).toBe('MOD_REORDER_INVALID');

      // Verify order untouched after refusals
      const beforeReorder = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(beforeReorder.json().mods.map((m: { id: string }) => m.id)).toEqual([
        mA.id,
        mB.id,
        mC.id,
      ]);

      // Valid reorder
      const validReorder = await app.inject({
        method: 'PUT',
        url: `/api/v1/servers/${serverAId}/mods/reorder`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { modIds: [mC.id, mB.id, mA.id] },
      });
      expect(validReorder.statusCode).toBe(200);
      const reorderedBody = serverModsListResponseSchema.parse(validReorder.json());
      expect(reorderedBody.mods.map(m => [m.id, m.loadOrder])).toEqual([
        [mC.id, 0],
        [mB.id, 1],
        [mA.id, 2],
      ]);
      expect(reorderedBody.launchPreview.modFlag).toBe('-mod=@A');
      expect(reorderedBody.launchPreview.serverModFlag).toBe('-serverMod=@B');
    });

    it('detects upstream updates via check-updates and transitions to up_to_date via markSynced', async () => {
      const syncedTime = '2026-11-01T10:00:00.000Z';
      const newerRemoteTime = new Date('2026-11-10T18:00:00.000Z');

      const addRes = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sourceType: 'workshop',
          workshopId: '1559212036',
          name: 'CF',
          folderName: '@CF',
          remoteUpdatedAt: syncedTime,
          markAsInstalled: true,
        },
      });
      const mod = addRes.json();
      expect(mod.syncStatus).toBe('up_to_date');

      vi.spyOn(steamWorkshopService, 'fetchPublishedFileMetadataMap').mockResolvedValueOnce(
        new Map([['1559212036', { sizeBytes: 8192, remoteUpdatedAt: newerRemoteTime }]]),
      );

      const checkRes = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods/check-updates`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(checkRes.statusCode).toBe(200);
      const checkedBody = checkRes.json();
      expect(checkedBody.updateAvailableCount).toBe(1);
      expect(checkedBody.mods[0].syncStatus).toBe('update_available');
      expect(checkedBody.mods[0].sizeBytes).toBe(8192);

      // Mark synced -> transitions back to up_to_date
      const syncRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/servers/${serverAId}/mods/${mod.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { markSynced: true },
      });
      expect(syncRes.statusCode).toBe(200);
      expect(syncRes.json().syncStatus).toBe('up_to_date');
      expect(syncRes.json().syncedWorkshopUpdatedAt).toBe(newerRemoteTime.toISOString());

      // Upstream error mapping on check-updates
      vi.spyOn(steamWorkshopService, 'fetchPublishedFileMetadataMap').mockRejectedValueOnce(
        new SteamWorkshopError(502, 'STEAM_WORKSHOP_API_ERROR', 'Steam down'),
      );
      const errRes = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods/check-updates`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(errRes.statusCode).toBe(502);
      expect(errRes.json().errorCode).toBe('STEAM_WORKSHOP_API_ERROR');
    });
  });

  describe('Mod Preset Import & Export (DSM-00354)', () => {
    describe('AC-01: Merge mode', () => {
      it('skips existing workshop mod, appends new mod sequentially at max(loadOrder) + 1', async () => {
        const now = new Date();
        // Seed 2 existing mods
        dbInstance.db
          .insert(serverMods)
          .values([
            {
              id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.WORKSHOP,
              loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
              workshopId: '1559212036',
              folderName: '@CF',
              name: 'CF',
              sizeBytes: 1024,
              remoteUpdatedAt: now,
              syncedWorkshopUpdatedAt: null,
              lastSyncedAt: null,
              enabled: true,
              loadOrder: 0,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.WORKSHOP,
              loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
              workshopId: '1793045599',
              folderName: '@Dabs Framework',
              name: 'Dabs Framework',
              sizeBytes: 2048,
              remoteUpdatedAt: now,
              syncedWorkshopUpdatedAt: null,
              lastSyncedAt: null,
              enabled: true,
              loadOrder: 1,
              createdAt: now,
              updatedAt: now,
            },
          ])
          .run();

        vi.spyOn(steamWorkshopService, 'getPublishedFileDetailsBatched').mockResolvedValueOnce([
          {
            result: 1,
            publishedfileid: '1559212036',
            title: 'CF',
            file_size: '1024',
            time_updated: 1600000000,
          },
          {
            result: 1,
            publishedfileid: '1828463567',
            title: 'Clothing Pack',
            file_size: '4096',
            time_updated: 1610000000,
          },
        ]);

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [
                { workshopId: '1559212036', name: 'Community Framework' },
                { workshopId: '1828463567', name: 'Clothing Pack' },
              ],
            },
            mode: MOD_IMPORT_MODE.MERGE,
          },
        });

        expect(res.statusCode).toBe(201);
        const body = importServerModsResponseSchema.parse(res.json());

        expect(body.skippedCount).toBe(1);
        expect(body.removedCount).toBe(0);
        expect(body.added).toHaveLength(1);
        expect(body.added[0].workshopId).toBe('1828463567');
        expect(body.added[0].loadOrder).toBe(2);
        expect(body.added[0].name).toBe('Clothing Pack');
        expect(body.added[0].folderName).toBe('@Clothing Pack');

        // Total mods in server
        expect(body.mods).toHaveLength(3);
        expect(body.mods.map(m => m.loadOrder)).toEqual([0, 1, 2]);

        // Verify DB persistence
        const allDbMods = dbInstance.db
          .select()
          .from(serverMods)
          .where(eq(serverMods.serverId, serverAId))
          .all();
        expect(allDbMods).toHaveLength(3);
      });
    });

    describe('AC-02: Replace mode', () => {
      it('removes workshop mods missing from the preset and keeps local mods in their load-order slot', async () => {
        const now = new Date();
        const oldWorkshopModId = 'dddddddd-dddd-4ddd-9ddd-dddddddddddd';
        const localModId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

        // Seed 1 workshop mod and 1 local mod
        dbInstance.db
          .insert(serverMods)
          .values([
            {
              id: oldWorkshopModId,
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.WORKSHOP,
              loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
              workshopId: '1111111111',
              folderName: '@OldWorkshop',
              name: 'Old Workshop Mod',
              sizeBytes: 1024,
              remoteUpdatedAt: now,
              syncedWorkshopUpdatedAt: null,
              lastSyncedAt: null,
              enabled: true,
              loadOrder: 0,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: localModId,
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.LOCAL,
              loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
              workshopId: null,
              folderName: '@CustomLocal',
              name: 'Custom Local Mod',
              sizeBytes: null,
              remoteUpdatedAt: null,
              syncedWorkshopUpdatedAt: null,
              lastSyncedAt: null,
              enabled: true,
              loadOrder: 1,
              createdAt: now,
              updatedAt: now,
            },
          ])
          .run();

        vi.spyOn(steamWorkshopService, 'getPublishedFileDetailsBatched').mockResolvedValueOnce([
          {
            result: 1,
            publishedfileid: '2222222222',
            title: 'Mod Alpha',
            file_size: '2048',
            time_updated: 1600000000,
          },
          {
            result: 1,
            publishedfileid: '3333333333',
            title: 'Mod Beta Server',
            file_size: '3072',
            time_updated: 1600000000,
          },
        ]);

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [{ workshopId: '2222222222', name: 'Mod Alpha' }],
              steamWsServerMods: [{ workshopId: '3333333333', name: 'Mod Beta Server' }],
            },
            mode: MOD_IMPORT_MODE.REPLACE,
          },
        });

        expect(res.statusCode).toBe(201);
        const body = importServerModsResponseSchema.parse(res.json());

        expect(body.removedCount).toBe(1);
        expect(body.added).toHaveLength(2);
        expect(body.mods).toHaveLength(3);

        // The old workshop slot (0) takes the first preset mod, the local mod keeps slot 1,
        // and the extra preset mod goes after it.
        const modAlpha = body.mods.find(m => m.workshopId === '2222222222');
        const modBeta = body.mods.find(m => m.workshopId === '3333333333');
        const localMod = body.mods.find(m => m.id === localModId);

        expect(modAlpha?.loadOrder).toBe(0);
        expect(modAlpha?.loadTarget).toBe('client_server');

        expect(localMod?.loadOrder).toBe(1);
        expect(localMod?.sourceType).toBe('local');

        expect(modBeta?.loadOrder).toBe(2);
        expect(modBeta?.loadTarget).toBe('server_only');

        // Verify Old Workshop Mod was purged from database
        const oldModInDb = dbInstance.db
          .select()
          .from(serverMods)
          .where(eq(serverMods.id, oldWorkshopModId))
          .get();
        expect(oldModInDb).toBeUndefined();

        const localModInDb = dbInstance.db
          .select()
          .from(serverMods)
          .where(eq(serverMods.id, localModId))
          .get();
        expect(localModInDb).toBeDefined();
        expect(localModInDb?.loadOrder).toBe(1);
      });

      it('updates mods already on the server in place, keeping folder, enabled flag and sync state', async () => {
        const syncedAt = new Date('2026-11-01T10:00:00.000Z');
        const keptModId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
        const localModId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

        dbInstance.db
          .insert(serverMods)
          .values([
            {
              id: localModId,
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.LOCAL,
              loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
              workshopId: null,
              folderName: '@LocalFirst',
              name: 'Local First',
              sizeBytes: null,
              remoteUpdatedAt: null,
              syncedWorkshopUpdatedAt: null,
              lastSyncedAt: null,
              enabled: true,
              loadOrder: 0,
              createdAt: syncedAt,
              updatedAt: syncedAt,
            },
            {
              id: keptModId,
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.WORKSHOP,
              loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
              workshopId: '1559212036',
              folderName: '@MyCustomCF',
              name: 'CF (renamed)',
              sizeBytes: 1024,
              remoteUpdatedAt: syncedAt,
              syncedWorkshopUpdatedAt: syncedAt,
              lastSyncedAt: syncedAt,
              enabled: false,
              loadOrder: 1,
              createdAt: syncedAt,
              updatedAt: syncedAt,
            },
          ])
          .run();

        vi.spyOn(steamWorkshopService, 'getPublishedFileDetailsBatched').mockResolvedValueOnce([
          {
            result: 1,
            publishedfileid: '1559212036',
            title: 'Community Framework',
            file_size: '4096',
            time_updated: syncedAt.getTime() / 1000,
          },
          {
            result: 1,
            publishedfileid: '2222222222',
            title: 'Mod Alpha',
            file_size: '2048',
            time_updated: 1600000000,
          },
        ]);

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [{ workshopId: '2222222222', name: 'Mod Alpha' }],
              steamWsServerMods: [{ workshopId: '1559212036', name: 'CF' }],
            },
            mode: MOD_IMPORT_MODE.REPLACE,
          },
        });

        expect(res.statusCode).toBe(201);
        const body = importServerModsResponseSchema.parse(res.json());

        expect(body.removedCount).toBe(0);
        expect(body.added.map(m => m.workshopId)).toEqual(['2222222222']);
        expect(body.mods.map(m => m.folderName)).toEqual([
          '@LocalFirst',
          '@Mod Alpha',
          '@MyCustomCF',
        ]);

        const kept = body.mods.find(m => m.id === keptModId);
        expect(kept).toMatchObject({
          folderName: '@MyCustomCF',
          name: 'CF (renamed)',
          enabled: false,
          loadOrder: 2,
          loadTarget: 'server_only',
          sizeBytes: 4096,
          syncStatus: 'up_to_date',
          lastSyncedAt: syncedAt.toISOString(),
        });
      });

      it('refuses with 409 and writes nothing when the server starts during the Steam lookup', async () => {
        vi.spyOn(steamWorkshopService, 'getPublishedFileDetailsBatched').mockImplementationOnce(
          async () => {
            dbInstance.db
              .update(servers)
              .set({ status: 'starting' })
              .where(eq(servers.id, serverAId))
              .run();
            return [];
          },
        );

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: { steamWsMods: [{ workshopId: '2222222222', name: 'Mod Alpha' }] },
            mode: MOD_IMPORT_MODE.REPLACE,
          },
        });

        expect(res.statusCode).toBe(409);
        expect(apiErrorResponseSchema.parse(res.json()).errorCode).toBe(
          'SERVER_RUNNING_CONFIG_LOCKED',
        );
        const rows = dbInstance.db
          .select()
          .from(serverMods)
          .where(eq(serverMods.serverId, serverAId))
          .all();
        expect(rows).toHaveLength(0);
      });
    });

    describe('AC-03: Steam API failure / unlisted fallback', () => {
      it('gracefully falls back to preset name, @<name> folder, and null remote details when Steam API fails', async () => {
        vi.spyOn(steamWorkshopService, 'getPublishedFileDetailsBatched').mockRejectedValueOnce(
          new Error('Steam Web API unreachable: connection timeout'),
        );

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [{ workshopId: '999999999', name: 'CustomMap' }],
            },
          },
        });

        expect(res.statusCode).toBe(201);
        const body = importServerModsResponseSchema.parse(res.json());

        expect(body.added).toHaveLength(1);
        const addedMod = body.added[0];
        expect(addedMod.name).toBe('CustomMap');
        expect(addedMod.folderName).toBe('@CustomMap');
        expect(addedMod.sizeBytes).toBeNull();
        expect(addedMod.remoteUpdatedAt).toBeNull();

        // Verify DB persistence
        const dbRow = dbInstance.db
          .select()
          .from(serverMods)
          .where(eq(serverMods.serverId, serverAId))
          .get()!;
        expect(dbRow.name).toBe('CustomMap');
        expect(dbRow.folderName).toBe('@CustomMap');
        expect(dbRow.sizeBytes).toBeNull();
        expect(dbRow.remoteUpdatedAt).toBeNull();
      });

      it('gracefully falls back when Steam item returns result != 1 (delisted or private item)', async () => {
        vi.spyOn(steamWorkshopService, 'getPublishedFileDetailsBatched').mockResolvedValueOnce([
          {
            result: 9, // k_EResultFileNotFound
            publishedfileid: '888888888',
          },
        ]);

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [{ workshopId: '888888888', name: 'PrivateMod' }],
            },
          },
        });

        expect(res.statusCode).toBe(201);
        const body = importServerModsResponseSchema.parse(res.json());
        expect(body.added[0].name).toBe('PrivateMod');
        expect(body.added[0].folderName).toBe('@PrivateMod');
        expect(body.added[0].sizeBytes).toBeNull();
      });

      it('handles Steam details with undefined, empty, or negative file_size gracefully', async () => {
        vi.spyOn(steamWorkshopService, 'getPublishedFileDetailsBatched').mockResolvedValueOnce([
          {
            result: 1,
            publishedfileid: '1559212036',
            title: 'CF',
            file_size: undefined,
          },
          {
            result: 1,
            publishedfileid: '2288070966',
            title: 'VPPAdminTools',
            file_size: '-500',
          },
          {
            result: 1,
            publishedfileid: '1828463567',
            title: 'Clothing',
            file_size: 'not-a-number',
          },
        ]);

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [
                { workshopId: '1559212036', name: 'CF' },
                { workshopId: '2288070966', name: 'VPPAdminTools' },
                { workshopId: '1828463567', name: 'Clothing' },
              ],
            },
          },
        });

        expect(res.statusCode).toBe(201);
        const body = importServerModsResponseSchema.parse(res.json());
        expect(body.added).toHaveLength(3);
        expect(body.added[0].sizeBytes).toBeNull();
        expect(body.added[1].sizeBytes).toBeNull();
        expect(body.added[2].sizeBytes).toBeNull();
      });

      it('deduplicates internal duplicate workshop IDs in preset payload and counts them in skippedCount', async () => {
        vi.spyOn(steamWorkshopService, 'getPublishedFileDetailsBatched').mockResolvedValueOnce([
          {
            result: 1,
            publishedfileid: '1559212036',
            title: 'CF',
            file_size: '1024',
          },
        ]);

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [
                { workshopId: '1559212036', name: 'CF Client' },
                { workshopId: '1559212036', name: 'CF Duplicate In Same List' },
              ],
              steamWsServerMods: [
                { workshopId: '1559212036', name: 'CF Duplicate In Server List' },
              ],
            },
          },
        });

        expect(res.statusCode).toBe(201);
        const body = importServerModsResponseSchema.parse(res.json());
        expect(body.skippedCount).toBe(2);
        expect(body.added).toHaveLength(1);
        expect(body.added[0].workshopId).toBe('1559212036');
        expect(body.added[0].name).toBe('CF');
      });
    });

    describe('AC-04: Running server lock (GUARD-01)', () => {
      it('returns 409 SERVER_RUNNING_CONFIG_LOCKED and ensures zero DB changes when server is running or starting', async () => {
        dbInstance.db
          .update(servers)
          .set({ status: 'running' })
          .where(eq(servers.id, serverAId))
          .run();

        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [{ workshopId: '1559212036', name: 'CF' }],
            },
          },
        });

        expect(res.statusCode).toBe(409);
        const body = apiErrorResponseSchema.parse(res.json());
        expect(body.errorCode).toBe('SERVER_RUNNING_CONFIG_LOCKED');

        // Zero mutation guarantee
        const dbMods = dbInstance.db
          .select()
          .from(serverMods)
          .where(eq(serverMods.serverId, serverAId))
          .all();
        expect(dbMods).toHaveLength(0);

        // Also test starting state
        dbInstance.db
          .update(servers)
          .set({ status: 'starting' })
          .where(eq(servers.id, serverAId))
          .run();

        const startingRes = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [{ workshopId: '1559212036', name: 'CF' }],
            },
          },
        });

        expect(startingRes.statusCode).toBe(409);
        expect(startingRes.json().errorCode).toBe('SERVER_RUNNING_CONFIG_LOCKED');
      });
    });

    describe('AC-05: Active server mod preset export', () => {
      it('exports only enabled workshop mods by default, strictly excludes local mods, and includes disabled mods when requested', async () => {
        const now = new Date();

        dbInstance.db
          .insert(serverMods)
          .values([
            // Enabled client/server workshop mod
            {
              id: '11111111-0000-4000-a000-000000000001',
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.WORKSHOP,
              loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
              workshopId: '1559212036',
              folderName: '@CF',
              name: 'Community Framework',
              sizeBytes: 1024,
              remoteUpdatedAt: now,
              syncedWorkshopUpdatedAt: null,
              lastSyncedAt: null,
              enabled: true,
              loadOrder: 0,
              createdAt: now,
              updatedAt: now,
            },
            // Enabled server-only workshop mod
            {
              id: '11111111-0000-4000-a000-000000000002',
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.WORKSHOP,
              loadTarget: MOD_LOAD_TARGET.SERVER_ONLY,
              workshopId: '2288070966',
              folderName: '@VPPAdminTools',
              name: 'VPPAdminTools',
              sizeBytes: 2048,
              remoteUpdatedAt: now,
              syncedWorkshopUpdatedAt: null,
              lastSyncedAt: null,
              enabled: true,
              loadOrder: 1,
              createdAt: now,
              updatedAt: now,
            },
            // Disabled client/server workshop mod
            {
              id: '11111111-0000-4000-a000-000000000003',
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.WORKSHOP,
              loadTarget: MOD_LOAD_TARGET.CLIENT_SERVER,
              workshopId: '1828463567',
              folderName: '@DisabledClothing',
              name: 'Disabled Clothing',
              sizeBytes: 4096,
              remoteUpdatedAt: now,
              syncedWorkshopUpdatedAt: null,
              lastSyncedAt: null,
              enabled: false,
              loadOrder: 2,
              createdAt: now,
              updatedAt: now,
            },
            // Local mod (must be strictly excluded from all exports)
            {
              id: '11111111-0000-4000-a000-000000000004',
              serverId: serverAId,
              sourceType: MOD_SOURCE_TYPE.LOCAL,
              loadTarget: MOD_LOAD_TARGET.SERVER_ONLY,
              workshopId: null,
              folderName: '@LocalMod',
              name: 'Local Server Scripts',
              sizeBytes: null,
              remoteUpdatedAt: null,
              syncedWorkshopUpdatedAt: null,
              lastSyncedAt: null,
              enabled: true,
              loadOrder: 3,
              createdAt: now,
              updatedAt: now,
            },
          ])
          .run();

        // 1. Default export (includeDisabled = false)
        const defaultRes = await app.inject({
          method: 'GET',
          url: `/api/v1/servers/${serverAId}/mods/export-preset`,
          headers: { authorization: `Bearer ${adminToken}` },
        });

        expect(defaultRes.statusCode).toBe(200);
        const defaultPreset = modPresetSchema.parse(defaultRes.json());

        expect(defaultPreset.steamWsMods).toEqual([
          { workshopId: '1559212036', name: 'Community Framework' },
        ]);
        expect(defaultPreset.steamWsServerMods).toEqual([
          { workshopId: '2288070966', name: 'VPPAdminTools' },
        ]);

        // 2. Export with ?includeDisabled=true
        const allRes = await app.inject({
          method: 'GET',
          url: `/api/v1/servers/${serverAId}/mods/export-preset?includeDisabled=true`,
          headers: { authorization: `Bearer ${adminToken}` },
        });

        expect(allRes.statusCode).toBe(200);
        const allPreset = modPresetSchema.parse(allRes.json());

        expect(allPreset.steamWsMods).toEqual([
          { workshopId: '1559212036', name: 'Community Framework' },
          { workshopId: '1828463567', name: 'Disabled Clothing' },
        ]);
        expect(allPreset.steamWsServerMods).toEqual([
          { workshopId: '2288070966', name: 'VPPAdminTools' },
        ]);
      });
    });

    describe('Security and Validation Refusals', () => {
      it('refuses import with 403 when caller lacks admin role', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${setupToken}` },
          payload: {
            preset: { steamWsMods: [{ workshopId: '1559212036', name: 'CF' }] },
          },
        });

        expect(res.statusCode).toBe(403);
        expect(res.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
      });

      it('refuses import and export with 404 when server does not exist', async () => {
        const importRes = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${missingServerId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: { steamWsMods: [{ workshopId: '1559212036', name: 'CF' }] },
          },
        });
        expect(importRes.statusCode).toBe(404);
        expect(importRes.json().errorCode).toBe('SERVER_NOT_FOUND');

        const exportRes = await app.inject({
          method: 'GET',
          url: `/api/v1/servers/${missingServerId}/mods/export-preset`,
          headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(exportRes.statusCode).toBe(404);
        expect(exportRes.json().errorCode).toBe('SERVER_NOT_FOUND');
      });

      it('refuses export with 401 when unauthenticated', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/servers/${serverAId}/mods/export-preset`,
        });
        expect(res.statusCode).toBe(401);
      });

      it('refuses export with 400 VALIDATION_FAILED when query param is invalid', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/servers/${serverAId}/mods/export-preset?includeDisabled=not-a-boolean`,
          headers: { authorization: `Bearer ${adminToken}` },
        });

        expect(res.statusCode).toBe(400);
        expect(res.json().errorCode).toBe('VALIDATION_FAILED');
      });

      it('refuses import with 400 VALIDATION_FAILED when payload or workshopId is malformed', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/servers/${serverAId}/mods/import`,
          headers: { authorization: `Bearer ${adminToken}` },
          payload: {
            preset: {
              steamWsMods: [{ workshopId: 'invalid-id', name: 'Bad Mod' }],
            },
          },
        });

        expect(res.statusCode).toBe(400);
        expect(res.json().errorCode).toBe('VALIDATION_FAILED');
      });
    });
  });
});
