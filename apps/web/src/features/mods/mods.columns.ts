import {
  MOD_LOAD_TARGET,
  type ModLoadTarget,
  type ModSyncStatus,
  type ServerModDto,
} from '@aegis/api-contracts';
import type { StatusTagStatus, TableColumnItem } from '@aegis/ui';

export type ModColumnId =
  | 'order'
  | 'mod'
  | 'folderName'
  | 'loadTarget'
  | 'sizeBytes'
  | 'syncStatus'
  | 'remoteUpdatedAt'
  | 'lastSyncedAt'
  | 'createdAt'
  | 'enabled'
  | 'actions';

export type ModSortKey =
  | 'order'
  | 'name'
  | 'loadTarget'
  | 'sizeBytes'
  | 'syncStatus'
  | 'remoteUpdatedAt'
  | 'lastSyncedAt'
  | 'createdAt'
  | 'enabled';

export interface ModSortState {
  key: ModSortKey;
  direction: 'asc' | 'desc';
}

export const DEFAULT_SORT_STATE: ModSortState = { key: 'order', direction: 'asc' };
export const MOD_COLUMNS_STORAGE_KEY = 'dsm.mods.table.columns';
export const LOCKED_MOD_COLUMN_IDS = new Set<string>(['order', 'mod', 'enabled', 'actions']);

export const DEFAULT_MOD_COLUMNS: TableColumnItem[] = [
  { id: 'order', label: 'Order', isVisible: true, canHide: false },
  { id: 'mod', label: 'Mod', isVisible: true, canHide: false },
  { id: 'folderName', label: '@Folder', isVisible: true, canHide: true },
  { id: 'loadTarget', label: 'Target', isVisible: true, canHide: true },
  { id: 'sizeBytes', label: 'Size', isVisible: true, canHide: true },
  { id: 'syncStatus', label: 'Sync Status', isVisible: true, canHide: true },
  { id: 'remoteUpdatedAt', label: 'Workshop Updated', isVisible: false, canHide: true },
  { id: 'lastSyncedAt', label: 'Last Synced', isVisible: false, canHide: true },
  { id: 'createdAt', label: 'Added', isVisible: false, canHide: true },
  { id: 'enabled', label: 'Enabled', isVisible: true, canHide: false },
  { id: 'actions', label: 'Actions', isVisible: true, canHide: false },
];

const DEFAULT_COLUMN_BY_ID = new Map(DEFAULT_MOD_COLUMNS.map(col => [col.id, col]));

const MOD_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatModTimestamp(value: string | Date | null): string {
  if (value === null) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return MOD_DATE_FORMATTER.format(date);
}

export function getSyncBadgeProps(syncStatus: ModSyncStatus): {
  status: StatusTagStatus;
  label: string;
} {
  switch (syncStatus) {
    case 'up_to_date':
      return { status: 'success', label: 'Up to date' };
    case 'update_available':
      return { status: 'warning', label: 'Update available' };
    case 'not_synced':
      return { status: 'neutral', label: 'Not synced' };
    case 'local':
    default:
      return { status: 'info', label: 'Local' };
  }
}

export function getTargetLabel(target: ModLoadTarget): {
  label: string;
  color: 'primary' | 'info' | 'default';
} {
  if (target === MOD_LOAD_TARGET.CLIENT_SERVER) {
    return { label: 'Client & Server', color: 'primary' };
  }
  if (target === MOD_LOAD_TARGET.SERVER_ONLY) {
    return { label: 'Server Only', color: 'info' };
  }
  return { label: 'Client Optional', color: 'default' };
}

function normalizeStoredColumns(stored: unknown): {
  normalized: TableColumnItem[];
  seen: Set<string>;
} {
  if (!Array.isArray(stored)) {
    return { normalized: [], seen: new Set() };
  }

  const seen = new Set<string>();
  const normalized: TableColumnItem[] = [];

  for (const item of stored) {
    if (!item || typeof item !== 'object') continue;
    const rawId = (item as { id?: unknown }).id;
    if (typeof rawId !== 'string' || seen.has(rawId)) continue;
    const def = DEFAULT_COLUMN_BY_ID.get(rawId);
    if (!def) continue;

    seen.add(rawId);
    const isLocked = LOCKED_MOD_COLUMN_IDS.has(rawId);
    const rawVisible = (item as { isVisible?: unknown }).isVisible;
    let isVisible = def.isVisible;
    if (isLocked) {
      isVisible = true;
    } else if (typeof rawVisible === 'boolean') {
      isVisible = rawVisible;
    }

    normalized.push({
      id: def.id,
      label: def.label,
      isVisible,
      canHide: !isLocked,
    });
  }

  return { normalized, seen };
}

function appendMissingColumns(columns: TableColumnItem[], seen: Set<string>): TableColumnItem[] {
  const missing = DEFAULT_MOD_COLUMNS.filter(def => !seen.has(def.id));
  if (missing.length === 0) return columns;

  const result = [...columns];
  const missingBody = missing.filter(def => def.id !== 'enabled' && def.id !== 'actions');
  const trailingIndex = result.findIndex(col => col.id === 'enabled' || col.id === 'actions');

  if (trailingIndex === -1) {
    result.push(...missingBody);
  } else {
    result.splice(trailingIndex, 0, ...missingBody);
  }

  if (!seen.has('enabled')) {
    const enabledCol = DEFAULT_COLUMN_BY_ID.get('enabled');
    if (enabledCol) {
      const actionsIndex = result.findIndex(col => col.id === 'actions');
      if (actionsIndex === -1) {
        result.push(enabledCol);
      } else {
        result.splice(actionsIndex, 0, enabledCol);
      }
    }
  }

  if (!seen.has('actions')) {
    const actionsCol = DEFAULT_COLUMN_BY_ID.get('actions');
    if (actionsCol) {
      result.push(actionsCol);
    }
  }

  return result;
}

export function reconcileModColumns(stored: unknown, isAdmin: boolean): TableColumnItem[] {
  const { normalized, seen } = normalizeStoredColumns(stored);
  const reconciled = appendMissingColumns(normalized, seen);
  return isAdmin ? reconciled : reconciled.filter(col => col.id !== 'actions');
}

function toTimestampMs(value: string | Date | null): number | null {
  if (value === null) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function compareNullableNumbers(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * dir;
}

export function compareModsByKey(
  a: ServerModDto,
  b: ServerModDto,
  key: ModSortKey,
  dir: 1 | -1,
): number {
  switch (key) {
    case 'order':
      return (a.loadOrder - b.loadOrder) * dir;
    case 'name':
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) * dir;
    case 'loadTarget':
      return (
        getTargetLabel(a.loadTarget).label.localeCompare(getTargetLabel(b.loadTarget).label) * dir
      );
    case 'sizeBytes':
      return compareNullableNumbers(a.sizeBytes, b.sizeBytes, dir);
    case 'syncStatus':
      return (
        getSyncBadgeProps(a.syncStatus).label.localeCompare(getSyncBadgeProps(b.syncStatus).label) *
        dir
      );
    case 'remoteUpdatedAt':
      return compareNullableNumbers(
        toTimestampMs(a.remoteUpdatedAt),
        toTimestampMs(b.remoteUpdatedAt),
        dir,
      );
    case 'lastSyncedAt':
      return compareNullableNumbers(
        toTimestampMs(a.lastSyncedAt),
        toTimestampMs(b.lastSyncedAt),
        dir,
      );
    case 'createdAt':
      return compareNullableNumbers(toTimestampMs(a.createdAt), toTimestampMs(b.createdAt), dir);
    case 'enabled':
      return (Number(a.enabled) - Number(b.enabled)) * dir;
  }
}

export function getNextSortState(prev: ModSortState, clickedKey: ModSortKey): ModSortState {
  if (clickedKey === 'order') {
    if (prev.key === 'order') {
      return { key: 'order', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    }
    return DEFAULT_SORT_STATE;
  }
  if (prev.key !== clickedKey) {
    return { key: clickedKey, direction: 'asc' };
  }
  if (prev.direction === 'asc') {
    return { key: clickedKey, direction: 'desc' };
  }
  return DEFAULT_SORT_STATE;
}
