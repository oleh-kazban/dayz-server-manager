import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  apiErrorResponseSchema,
  MOD_LOAD_TARGET,
  MOD_SOURCE_TYPE,
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
  let viewerToken: string;

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
    viewerToken = app.jwt.sign(
      { sub: 'viewer-id', role: 'viewer', type: 'access' },
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
    it('enforces authentication and admin-only mutations while allowing viewer GET', async () => {
      const unauth = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${serverAId}/mods`,
      });
      expect(unauth.statusCode).toBe(401);

      const viewerGet = await app.inject({
        method: 'GET',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(viewerGet.statusCode).toBe(200);

      const viewerPost = await app.inject({
        method: 'POST',
        url: `/api/v1/servers/${serverAId}/mods`,
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: {
          sourceType: 'local',
          name: 'Local Mod',
          folderName: '@Local',
        },
      });
      expect(viewerPost.statusCode).toBe(403);
      expect(viewerPost.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
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
});
