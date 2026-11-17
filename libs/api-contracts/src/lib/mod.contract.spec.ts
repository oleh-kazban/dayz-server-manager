import { describe, expect, it } from 'vitest';

import {
  addServerModSchema,
  batchAddServerModsResponseSchema,
  batchAddServerModsSchema,
  exportServerModsQuerySchema,
  importServerModsResponseSchema,
  importServerModsSchema,
  launchParamsPreviewSchema,
  MOD_IMPORT_MODE,
  MOD_LOAD_TARGET,
  MOD_PRESET_MAX_TOTAL_ITEMS,
  MOD_SOURCE_TYPE,
  MOD_SYNC_STATUS,
  modFolderNameSchema,
  modIdParamSchema,
  modImportModeSchema,
  modLoadTargetSchema,
  modPresetItemSchema,
  modPresetSchema,
  modSourceTypeSchema,
  modSyncStatusSchema,
  reorderServerModsSchema,
  serverModSchema,
  serverModsListResponseSchema,
  updateServerModSchema,
  WORKSHOP_SEARCH_MAX_PAGE,
  workshopIdSchema,
  workshopLookupRequestSchema,
  workshopLookupResponseSchema,
  workshopSearchQuerySchema,
  workshopSearchResponseSchema,
} from './mod.contract';

const SERVER_UUID = '11111111-1111-4111-a111-111111111111';
const MOD_UUID = '22222222-2222-4222-8222-222222222222';

describe('Mod Contracts (libs/api-contracts)', () => {
  describe('Enums', () => {
    it('validates source types, load targets, and sync statuses', () => {
      expect(modSourceTypeSchema.parse(MOD_SOURCE_TYPE.WORKSHOP)).toBe('workshop');
      expect(modSourceTypeSchema.parse(MOD_SOURCE_TYPE.LOCAL)).toBe('local');
      expect(() => modSourceTypeSchema.parse('git')).toThrow();

      expect(modLoadTargetSchema.parse(MOD_LOAD_TARGET.CLIENT_SERVER)).toBe('client_server');
      expect(modLoadTargetSchema.parse(MOD_LOAD_TARGET.SERVER_ONLY)).toBe('server_only');
      expect(modLoadTargetSchema.parse(MOD_LOAD_TARGET.CLIENT_OPTIONAL)).toBe('client_optional');
      expect(() => modLoadTargetSchema.parse('unknown')).toThrow();

      expect(modSyncStatusSchema.parse(MOD_SYNC_STATUS.UP_TO_DATE)).toBe('up_to_date');
      expect(modSyncStatusSchema.parse(MOD_SYNC_STATUS.UPDATE_AVAILABLE)).toBe('update_available');
      expect(modSyncStatusSchema.parse(MOD_SYNC_STATUS.NOT_SYNCED)).toBe('not_synced');
      expect(modSyncStatusSchema.parse(MOD_SYNC_STATUS.LOCAL)).toBe('local');
      expect(() => modSyncStatusSchema.parse('pending')).toThrow();
    });
  });

  describe('workshopIdSchema', () => {
    it('accepts 1 to 20 digit numeric Steam PublishedFileIds and trims whitespace', () => {
      expect(workshopIdSchema.parse('1559212036')).toBe('1559212036');
      expect(workshopIdSchema.parse('  1  ')).toBe('1');
      expect(workshopIdSchema.parse('9'.repeat(20))).toBe('9'.repeat(20));
    });

    it('rejects empty, non-numeric, negative, and >20-digit inputs', () => {
      for (const invalid of [
        '',
        '   ',
        'abc',
        '1559212036a',
        '-1559212036',
        '1.5',
        '1'.repeat(21),
      ]) {
        expect(() => workshopIdSchema.parse(invalid)).toThrow();
      }
    });
  });

  describe('modFolderNameSchema', () => {
    it('accepts @-prefixed mod folder names including spaces and trims outer whitespace', () => {
      expect(modFolderNameSchema.parse('@CF')).toBe('@CF');
      expect(modFolderNameSchema.parse('  @Dabs Framework  ')).toBe('@Dabs Framework');
      expect(modFolderNameSchema.parse(`@${'a'.repeat(127)}`)).toHaveLength(128);
    });

    it('rejects missing @, single @, >128 chars, semicolons, path separators, traversal, and null bytes', () => {
      const invalidFolders = [
        '',
        '@',
        'CF',
        '@CF;evil',
        '@CF/sub',
        '@CF\\sub',
        '@CF..parent',
        '@CF\0null',
        `@${'a'.repeat(128)}`,
      ];

      for (const folder of invalidFolders) {
        expect(() => modFolderNameSchema.parse(folder)).toThrow();
      }
    });
  });

  describe('modIdParamSchema', () => {
    it('validates UUID pair and rejects malformed server or mod IDs', () => {
      expect(modIdParamSchema.parse({ id: SERVER_UUID, modId: MOD_UUID })).toEqual({
        id: SERVER_UUID,
        modId: MOD_UUID,
      });
      expect(() => modIdParamSchema.parse({ id: 'bad', modId: MOD_UUID })).toThrow();
      expect(() => modIdParamSchema.parse({ id: SERVER_UUID, modId: 'bad' })).toThrow();
    });
  });

  describe('addServerModSchema & batchAddServerModsSchema', () => {
    it('parses workshop mod with defaults and allows empty folderName for deferred assignment', () => {
      const parsed = addServerModSchema.parse({
        sourceType: 'workshop',
        workshopId: '1559212036',
        name: 'CF',
      });

      expect(parsed).toEqual({
        sourceType: 'workshop',
        workshopId: '1559212036',
        name: 'CF',
        folderName: '',
        loadTarget: 'client_server',
        enabled: true,
        markAsInstalled: false,
      });
    });

    it('requires valid @folderName for local mods and rejects empty folderName', () => {
      const validLocal = addServerModSchema.parse({
        sourceType: 'local',
        name: 'Custom Server Scripts',
        folderName: '@ServerScripts',
      });
      expect(validLocal.loadTarget).toBe('client_server');
      expect(validLocal.enabled).toBe(true);

      expect(() =>
        addServerModSchema.parse({
          sourceType: 'local',
          name: 'Custom Server Scripts',
          folderName: '',
        }),
      ).toThrow();
    });

    it('enforces 1..200 item bounds on batchAddServerModsSchema', () => {
      expect(() => batchAddServerModsSchema.parse({ mods: [] })).toThrow();

      const validItem = {
        workshopId: '1559212036',
        name: 'CF',
        folderName: '@CF',
      };
      const parsed = batchAddServerModsSchema.parse({ mods: [validItem] });
      expect(parsed.mods).toHaveLength(1);
      expect(parsed.mods[0].sourceType).toBe('workshop');

      const tooMany = Array.from({ length: 201 }, (_, i) => ({
        workshopId: String(1000 + i),
        name: `Mod ${i}`,
        folderName: `@Mod${i}`,
      }));
      expect(() => batchAddServerModsSchema.parse({ mods: tooMany })).toThrow();
    });

    it('preserves undefined item-level markAsInstalled so batch-level markAsInstalled applies', () => {
      const parsed = batchAddServerModsSchema.parse({
        markAsInstalled: true,
        mods: [{ workshopId: '1559212036', name: 'CF' }],
      });
      expect(parsed.markAsInstalled).toBe(true);
      expect(parsed.mods[0].markAsInstalled).toBeUndefined();
    });
  });

  describe('updateServerModSchema & reorderServerModsSchema', () => {
    it('requires at least one mutable field in updateServerModSchema', () => {
      expect(() => updateServerModSchema.parse({})).toThrow();
      expect(updateServerModSchema.parse({ markSynced: true })).toEqual({ markSynced: true });
      expect(
        updateServerModSchema.parse({
          name: '  CF Updated  ',
          folderName: '@CF_Updated',
          loadTarget: 'server_only',
          enabled: false,
        }),
      ).toEqual({
        name: 'CF Updated',
        folderName: '@CF_Updated',
        loadTarget: 'server_only',
        enabled: false,
      });
    });

    it('validates UUID list on reorderServerModsSchema', () => {
      expect(reorderServerModsSchema.parse({ modIds: [MOD_UUID] })).toEqual({
        modIds: [MOD_UUID],
      });
      expect(() => reorderServerModsSchema.parse({ modIds: ['not-a-uuid'] })).toThrow();
    });
  });

  describe('Workshop Lookup & Search Schemas', () => {
    it('validates workshopLookupRequestSchema bounds', () => {
      expect(workshopLookupRequestSchema.parse({ input: '  1559212036  ' })).toEqual({
        input: '1559212036',
      });
      expect(() => workshopLookupRequestSchema.parse({ input: '   ' })).toThrow();
      expect(() => workshopLookupRequestSchema.parse({ input: 'x'.repeat(513) })).toThrow();
    });

    it('applies defaults and coerces pagination bounds in workshopSearchQuerySchema', () => {
      expect(workshopSearchQuerySchema.parse({})).toEqual({
        q: '',
        page: 1,
        pageSize: 20,
      });
      expect(workshopSearchQuerySchema.parse({ q: ' trader ', page: '3', pageSize: '50' })).toEqual(
        {
          q: 'trader',
          page: 3,
          pageSize: 50,
        },
      );
      expect(workshopSearchQuerySchema.parse({ page: 491 }).page).toBe(491);
      expect(workshopSearchQuerySchema.parse({ page: WORKSHOP_SEARCH_MAX_PAGE }).page).toBe(
        WORKSHOP_SEARCH_MAX_PAGE,
      );
      expect(() => workshopSearchQuerySchema.parse({ page: 0 })).toThrow();
      expect(() =>
        workshopSearchQuerySchema.parse({ page: WORKSHOP_SEARCH_MAX_PAGE + 1 }),
      ).toThrow();
      expect(() => workshopSearchQuerySchema.parse({ pageSize: 51 })).toThrow();
      expect(() => workshopSearchQuerySchema.parse({ q: 'a'.repeat(201) })).toThrow();
    });

    it('validates complete list, batch, lookup, and search response schemas', () => {
      const nowIso = '2026-11-10T20:00:00.000Z';
      const modDto = {
        id: MOD_UUID,
        serverId: SERVER_UUID,
        sourceType: 'workshop' as const,
        loadTarget: 'client_server' as const,
        workshopId: '1559212036',
        workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036',
        folderName: '@CF',
        name: 'CF',
        sizeBytes: 1048576,
        remoteUpdatedAt: nowIso,
        syncedWorkshopUpdatedAt: nowIso,
        lastSyncedAt: nowIso,
        syncStatus: 'up_to_date' as const,
        enabled: true,
        loadOrder: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const launchPreview = {
        modFlag: '-mod=@CF',
        serverModFlag: '',
        combinedArgs: ['-mod=@CF'],
        missingFolderCount: 0,
      };

      expect(serverModSchema.parse(modDto).syncStatus).toBe('up_to_date');
      expect(launchParamsPreviewSchema.parse(launchPreview).combinedArgs).toEqual(['-mod=@CF']);
      expect(
        serverModsListResponseSchema.parse({
          mods: [modDto],
          launchPreview,
          updateAvailableCount: 0,
        }).mods,
      ).toHaveLength(1);

      expect(
        batchAddServerModsResponseSchema.parse({
          added: [modDto],
          skippedCount: 1,
          mods: [modDto],
          launchPreview,
          updateAvailableCount: 0,
        }).skippedCount,
      ).toBe(1);

      const resolvedItem = {
        workshopId: '1559212036',
        name: 'CF',
        suggestedFolderName: '@CF',
        shortDescription: 'Community Framework',
        previewUrl: null,
        sizeBytes: 1024,
        remoteUpdatedAt: nowIso,
        subscriptions: 1000,
        tags: ['Mod'],
      };

      expect(
        workshopLookupResponseSchema.parse({
          kind: 'collection',
          collectionTitle: 'Server Pack',
          items: [resolvedItem],
          skippedCount: 2,
        }).kind,
      ).toBe('collection');

      expect(
        workshopSearchResponseSchema.parse({
          items: [resolvedItem],
          total: 1,
          page: 1,
          pageSize: 20,
        }).total,
      ).toBe(1);
    });
  });

  describe('Community Mod Preset & Import/Export Contracts (DSM-00354)', () => {
    describe('modPresetItemSchema', () => {
      it('accepts valid workshopId and mod name, trimming whitespace', () => {
        const item = modPresetItemSchema.parse({
          workshopId: '1559212036',
          name: '  Community Framework  ',
        });
        expect(item.workshopId).toBe('1559212036');
        expect(item.name).toBe('Community Framework');
      });

      it('rejects empty or whitespace-only mod name', () => {
        expect(() => modPresetItemSchema.parse({ workshopId: '1559212036', name: '' })).toThrow(
          /Mod name is required/i,
        );
        expect(() => modPresetItemSchema.parse({ workshopId: '1559212036', name: '   ' })).toThrow(
          /Mod name is required/i,
        );
      });

      it('rejects mod names exceeding 200 characters', () => {
        expect(() =>
          modPresetItemSchema.parse({
            workshopId: '1559212036',
            name: 'a'.repeat(201),
          }),
        ).toThrow();
      });

      it('rejects malformed or non-numeric workshopId', () => {
        expect(() => modPresetItemSchema.parse({ workshopId: 'invalid-id', name: 'CF' })).toThrow();
      });
    });

    describe('modPresetSchema', () => {
      it('accepts valid preset with client and server mods and defaults empty lists', () => {
        const emptyParsed = modPresetSchema.parse({});
        expect(emptyParsed.steamWsMods).toEqual([]);
        expect(emptyParsed.steamWsServerMods).toEqual([]);

        const fullParsed = modPresetSchema.parse({
          steamWsMods: [{ workshopId: '1559212036', name: 'CF' }],
          steamWsServerMods: [{ workshopId: '2288070966', name: 'VPPAdminTools' }],
        });
        expect(fullParsed.steamWsMods).toHaveLength(1);
        expect(fullParsed.steamWsServerMods).toHaveLength(1);
      });

      it('accepts presets up to MOD_PRESET_MAX_TOTAL_ITEMS (300)', () => {
        const steamWsMods = Array.from({ length: 150 }, (_, i) => ({
          workshopId: String(1000 + i),
          name: `Mod ${i}`,
        }));
        const steamWsServerMods = Array.from({ length: 150 }, (_, i) => ({
          workshopId: String(2000 + i),
          name: `ServerMod ${i}`,
        }));

        const parsed = modPresetSchema.parse({ steamWsMods, steamWsServerMods });
        expect(parsed.steamWsMods.length + parsed.steamWsServerMods.length).toBe(
          MOD_PRESET_MAX_TOTAL_ITEMS,
        );
      });

      it('rejects presets exceeding MOD_PRESET_MAX_TOTAL_ITEMS (300) with descriptive error', () => {
        const steamWsMods = Array.from({ length: 200 }, (_, i) => ({
          workshopId: String(1000 + i),
          name: `Mod ${i}`,
        }));
        const steamWsServerMods = Array.from({ length: 101 }, (_, i) => ({
          workshopId: String(2000 + i),
          name: `ServerMod ${i}`,
        }));

        expect(() => modPresetSchema.parse({ steamWsMods, steamWsServerMods })).toThrow(
          /Total preset mods cannot exceed 300/i,
        );
      });
    });

    describe('modImportModeSchema & importServerModsSchema', () => {
      it('validates merge and replace import modes and defaults to merge', () => {
        expect(modImportModeSchema.parse(MOD_IMPORT_MODE.MERGE)).toBe('merge');
        expect(modImportModeSchema.parse(MOD_IMPORT_MODE.REPLACE)).toBe('replace');
        expect(() => modImportModeSchema.parse('append')).toThrow();

        const defaultModeParsed = importServerModsSchema.parse({
          preset: { steamWsMods: [{ workshopId: '1559212036', name: 'CF' }] },
        });
        expect(defaultModeParsed.mode).toBe('merge');

        const explicitReplaceParsed = importServerModsSchema.parse({
          preset: { steamWsMods: [{ workshopId: '1559212036', name: 'CF' }] },
          mode: 'replace',
        });
        expect(explicitReplaceParsed.mode).toBe('replace');
      });

      it('rejects invalid preset payload inside importServerModsSchema', () => {
        expect(() =>
          importServerModsSchema.parse({
            preset: {
              steamWsMods: Array.from({ length: 301 }, (_, i) => ({
                workshopId: String(1000 + i),
                name: `Mod ${i}`,
              })),
            },
          }),
        ).toThrow(/Total preset mods cannot exceed 300/i);
      });
    });

    describe('exportServerModsQuerySchema', () => {
      it('defaults includeDisabled to false when omitted or empty', () => {
        expect(exportServerModsQuerySchema.parse({})).toEqual({ includeDisabled: false });
      });

      it('coerces boolean and string representations for includeDisabled', () => {
        expect(exportServerModsQuerySchema.parse({ includeDisabled: true })).toEqual({
          includeDisabled: true,
        });
        expect(exportServerModsQuerySchema.parse({ includeDisabled: 'true' })).toEqual({
          includeDisabled: true,
        });
        expect(exportServerModsQuerySchema.parse({ includeDisabled: '1' })).toEqual({
          includeDisabled: true,
        });

        expect(exportServerModsQuerySchema.parse({ includeDisabled: false })).toEqual({
          includeDisabled: false,
        });
        expect(exportServerModsQuerySchema.parse({ includeDisabled: 'false' })).toEqual({
          includeDisabled: false,
        });
        expect(exportServerModsQuerySchema.parse({ includeDisabled: '0' })).toEqual({
          includeDisabled: false,
        });
      });
    });

    describe('importServerModsResponseSchema', () => {
      it('parses valid import response structure', () => {
        const nowIso = new Date().toISOString();
        const modDto = {
          id: MOD_UUID,
          serverId: SERVER_UUID,
          sourceType: 'workshop' as const,
          loadTarget: 'client_server' as const,
          workshopId: '1559212036',
          workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036',
          folderName: '@CF',
          name: 'CF',
          sizeBytes: 1048576,
          remoteUpdatedAt: nowIso,
          syncedWorkshopUpdatedAt: null,
          lastSyncedAt: null,
          syncStatus: 'not_synced' as const,
          enabled: true,
          loadOrder: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        const res = importServerModsResponseSchema.parse({
          added: [modDto],
          skippedCount: 1,
          removedCount: 2,
          mods: [modDto],
          launchPreview: {
            modFlag: '-mod=@CF',
            serverModFlag: '',
            combinedArgs: ['-mod=@CF'],
            missingFolderCount: 0,
          },
          updateAvailableCount: 0,
        });

        expect(res.added).toHaveLength(1);
        expect(res.skippedCount).toBe(1);
        expect(res.removedCount).toBe(2);
        expect(res.launchPreview.combinedArgs).toEqual(['-mod=@CF']);
      });
    });
  });
});
