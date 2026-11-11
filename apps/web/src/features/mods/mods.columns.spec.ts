import { describe, expect, it } from 'vitest';

import type { ServerModDto } from '@aegis/api-contracts';

import {
  compareModsByKey,
  DEFAULT_MOD_COLUMNS,
  DEFAULT_SORT_STATE,
  formatModTimestamp,
  getNextSortState,
  getSyncBadgeProps,
  getTargetLabel,
  reconcileModColumns,
} from './mods.columns';

function makeMod(overrides: Partial<ServerModDto> = {}): ServerModDto {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    serverId: '00000000-0000-4000-8000-000000000010',
    sourceType: 'workshop',
    loadTarget: 'client_server',
    workshopId: '1559212036',
    workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036',
    folderName: '@CF',
    name: 'CF',
    sizeBytes: 1024,
    remoteUpdatedAt: '2026-11-10T10:00:00.000Z',
    syncedWorkshopUpdatedAt: '2026-11-10T10:00:00.000Z',
    lastSyncedAt: '2026-11-10T10:00:00.000Z',
    syncStatus: 'up_to_date',
    enabled: true,
    loadOrder: 0,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('mods.columns', () => {
  describe('reconcileModColumns', () => {
    it('returns the default 11 columns for admins and omits actions for non-admins', () => {
      const adminCols = reconcileModColumns(null, true);
      expect(adminCols).toHaveLength(11);
      expect(adminCols.map(c => c.id)).toEqual([
        'order',
        'mod',
        'folderName',
        'loadTarget',
        'sizeBytes',
        'syncStatus',
        'remoteUpdatedAt',
        'lastSyncedAt',
        'createdAt',
        'enabled',
        'actions',
      ]);
      expect(adminCols.filter(c => !c.isVisible).map(c => c.id)).toEqual([
        'remoteUpdatedAt',
        'lastSyncedAt',
        'createdAt',
      ]);
      expect(adminCols.filter(c => c.canHide === false).map(c => c.id)).toEqual([
        'order',
        'mod',
        'enabled',
        'actions',
      ]);

      const viewerCols = reconcileModColumns(undefined, false);
      expect(viewerCols).toHaveLength(10);
      expect(viewerCols.map(c => c.id)).not.toContain('actions');
      expect(viewerCols[viewerCols.length - 1]?.id).toBe('enabled');
    });

    it('forces locked columns (order, mod, enabled, actions) to isVisible: true and canHide: false even if tampered', () => {
      const tampered = DEFAULT_MOD_COLUMNS.map(col => ({
        ...col,
        isVisible: false,
        canHide: true,
      }));

      const reconciled = reconcileModColumns(tampered, true);

      for (const lockedId of ['order', 'mod', 'enabled', 'actions']) {
        const found = reconciled.find(c => c.id === lockedId);
        expect(found).toMatchObject({
          id: lockedId,
          isVisible: true,
          canHide: false,
        });
      }

      // Non-locked columns keep their stored visibility preference
      expect(reconciled.find(c => c.id === 'sizeBytes')).toMatchObject({
        isVisible: false,
        canHide: true,
      });
    });

    it('preserves valid user-reordered toggleable columns, ignores invalid/duplicate entries, and inserts missing defaults before enabled/actions', () => {
      const stored = [
        null,
        { id: 'unknown_col', isVisible: true },
        { id: 'order', isVisible: false },
        { id: 'mod', isVisible: true },
        { id: 'sizeBytes', isVisible: true },
        { id: 'sizeBytes', isVisible: false }, // duplicate should be ignored
        { id: 'folderName', isVisible: false },
        { id: 'enabled', isVisible: false },
        { id: 'actions', isVisible: false },
      ];

      const reconciled = reconcileModColumns(stored, true);

      expect(reconciled.map(c => c.id)).toEqual([
        'order',
        'mod',
        'sizeBytes',
        'folderName',
        'loadTarget',
        'syncStatus',
        'remoteUpdatedAt',
        'lastSyncedAt',
        'createdAt',
        'enabled',
        'actions',
      ]);
      expect(reconciled.find(c => c.id === 'sizeBytes')?.isVisible).toBe(true);
      expect(reconciled.find(c => c.id === 'folderName')?.isVisible).toBe(false);
    });

    it('places missing enabled column immediately before actions when enabled was omitted from stored columns', () => {
      const stored = [
        { id: 'order', isVisible: true },
        { id: 'mod', isVisible: true },
        { id: 'actions', isVisible: true },
      ];

      const reconciled = reconcileModColumns(stored, true);
      expect(reconciled.slice(-2).map(c => c.id)).toEqual(['enabled', 'actions']);
    });

    it('appends missing body, enabled, and actions columns when neither enabled nor actions were stored', () => {
      const stored = [
        { id: 'order', isVisible: true },
        { id: 'mod', isVisible: true },
        { id: 'syncStatus', isVisible: false },
      ];

      const reconciled = reconcileModColumns(stored, true);
      expect(reconciled.map(c => c.id)).toEqual([
        'order',
        'mod',
        'syncStatus',
        'folderName',
        'loadTarget',
        'sizeBytes',
        'remoteUpdatedAt',
        'lastSyncedAt',
        'createdAt',
        'enabled',
        'actions',
      ]);
      expect(reconciled.find(c => c.id === 'syncStatus')?.isVisible).toBe(false);
    });
  });

  describe('formatModTimestamp', () => {
    it('returns em-dash for null or invalid dates and formatted text for valid ISO strings or Dates', () => {
      expect(formatModTimestamp(null)).toBe('—');
      expect(formatModTimestamp('')).toBe('—');
      expect(formatModTimestamp('not-a-valid-date')).toBe('—');
      expect(formatModTimestamp(new Date('invalid'))).toBe('—');

      const iso = '2026-11-10T10:15:00.000Z';
      const formattedFromIso = formatModTimestamp(iso);
      const formattedFromDate = formatModTimestamp(new Date(iso));
      expect(formattedFromIso).not.toBe('—');
      expect(formattedFromIso.length).toBeGreaterThan(0);
      expect(formattedFromDate).toBe(formattedFromIso);
    });
  });

  describe('getSyncBadgeProps & getTargetLabel', () => {
    it('maps sync statuses and load targets to display labels', () => {
      expect(getSyncBadgeProps('up_to_date')).toEqual({ status: 'success', label: 'Up to date' });
      expect(getSyncBadgeProps('update_available')).toEqual({
        status: 'warning',
        label: 'Update available',
      });
      expect(getSyncBadgeProps('not_synced')).toEqual({ status: 'neutral', label: 'Not synced' });
      expect(getSyncBadgeProps('local')).toEqual({ status: 'info', label: 'Local' });

      expect(getTargetLabel('client_server')).toEqual({
        label: 'Client & Server',
        color: 'primary',
      });
      expect(getTargetLabel('server_only')).toEqual({ label: 'Server Only', color: 'info' });
      expect(getTargetLabel('client_optional')).toEqual({
        label: 'Client Optional',
        color: 'default',
      });
    });
  });

  describe('getNextSortState', () => {
    it('toggles order between asc and desc and resets to order asc when clicking order from another key', () => {
      expect(getNextSortState({ key: 'order', direction: 'asc' }, 'order')).toEqual({
        key: 'order',
        direction: 'desc',
      });
      expect(getNextSortState({ key: 'order', direction: 'desc' }, 'order')).toEqual({
        key: 'order',
        direction: 'asc',
      });
      expect(getNextSortState({ key: 'sizeBytes', direction: 'desc' }, 'order')).toEqual(
        DEFAULT_SORT_STATE,
      );
    });

    it('cycles other sort keys through asc -> desc -> default order asc', () => {
      const click1 = getNextSortState(DEFAULT_SORT_STATE, 'sizeBytes');
      expect(click1).toEqual({ key: 'sizeBytes', direction: 'asc' });

      const click2 = getNextSortState(click1, 'sizeBytes');
      expect(click2).toEqual({ key: 'sizeBytes', direction: 'desc' });

      const click3 = getNextSortState(click2, 'sizeBytes');
      expect(click3).toEqual(DEFAULT_SORT_STATE);

      // Switching directly to another key starts at asc
      expect(getNextSortState(click2, 'name')).toEqual({ key: 'name', direction: 'asc' });
    });
  });

  describe('compareModsByKey', () => {
    it('always sorts null numeric and date fields last regardless of asc or desc direction', () => {
      const small = makeMod({
        id: '1',
        sizeBytes: 100,
        remoteUpdatedAt: '2026-11-01T10:00:00.000Z',
        lastSyncedAt: '2026-11-02T10:00:00.000Z',
      });
      const large = makeMod({
        id: '2',
        sizeBytes: 500,
        remoteUpdatedAt: '2026-11-10T10:00:00.000Z',
        lastSyncedAt: '2026-11-11T10:00:00.000Z',
      });
      const empty = makeMod({
        id: '3',
        sizeBytes: null,
        remoteUpdatedAt: null,
        lastSyncedAt: null,
      });

      const ascBySize = [empty, large, small].sort((a, b) =>
        compareModsByKey(a, b, 'sizeBytes', 1),
      );
      expect(ascBySize.map(m => m.id)).toEqual(['1', '2', '3']);

      const descBySize = [empty, small, large].sort((a, b) =>
        compareModsByKey(a, b, 'sizeBytes', -1),
      );
      expect(descBySize.map(m => m.id)).toEqual(['2', '1', '3']);

      const ascByRemote = [empty, large, small].sort((a, b) =>
        compareModsByKey(a, b, 'remoteUpdatedAt', 1),
      );
      expect(ascByRemote.map(m => m.id)).toEqual(['1', '2', '3']);

      const descByRemote = [empty, small, large].sort((a, b) =>
        compareModsByKey(a, b, 'remoteUpdatedAt', -1),
      );
      expect(descByRemote.map(m => m.id)).toEqual(['2', '1', '3']);

      const ascBySynced = [empty, large, small].sort((a, b) =>
        compareModsByKey(a, b, 'lastSyncedAt', 1),
      );
      expect(ascBySynced.map(m => m.id)).toEqual(['1', '2', '3']);

      const descBySynced = [empty, small, large].sort((a, b) =>
        compareModsByKey(a, b, 'lastSyncedAt', -1),
      );
      expect(descBySynced.map(m => m.id)).toEqual(['2', '1', '3']);

      expect(compareModsByKey(empty, empty, 'sizeBytes', 1)).toBe(0);

      // Invalid date string and Date instance handling in toTimestampMs
      const withInvalidDate = makeMod({ id: 'inv', remoteUpdatedAt: 'bad-date' });
      const withDateObj = makeMod({
        id: 'dt',
        remoteUpdatedAt: new Date('2026-11-05T10:00:00.000Z') as unknown as string,
      });
      expect(compareModsByKey(withInvalidDate, withDateObj, 'remoteUpdatedAt', 1)).toBe(1);
      expect(compareModsByKey(withDateObj, withInvalidDate, 'remoteUpdatedAt', -1)).toBe(-1);
    });

    it('compares order, name, loadTarget, syncStatus, createdAt, and enabled in asc and desc', () => {
      const a = makeMod({
        id: 'a',
        loadOrder: 0,
        name: 'alpha',
        loadTarget: 'client_server',
        syncStatus: 'local',
        createdAt: '2026-11-01T00:00:00.000Z',
        enabled: false,
      });
      const b = makeMod({
        id: 'b',
        loadOrder: 2,
        name: 'Beta',
        loadTarget: 'server_only',
        syncStatus: 'up_to_date',
        createdAt: '2026-11-05T00:00:00.000Z',
        enabled: true,
      });

      expect(compareModsByKey(a, b, 'order', 1)).toBeLessThan(0);
      expect(compareModsByKey(a, b, 'order', -1)).toBeGreaterThan(0);
      expect(compareModsByKey(a, b, 'name', 1)).toBeLessThan(0);
      expect(compareModsByKey(a, b, 'name', -1)).toBeGreaterThan(0);
      expect(compareModsByKey(a, b, 'loadTarget', 1)).toBeLessThan(0);
      expect(compareModsByKey(a, b, 'syncStatus', 1)).toBeLessThan(0);
      expect(compareModsByKey(a, b, 'createdAt', 1)).toBeLessThan(0);
      expect(compareModsByKey(a, b, 'createdAt', -1)).toBeGreaterThan(0);
      expect(compareModsByKey(a, b, 'enabled', 1)).toBeLessThan(0);
      expect(compareModsByKey(a, b, 'enabled', -1)).toBeGreaterThan(0);
    });
  });
});
