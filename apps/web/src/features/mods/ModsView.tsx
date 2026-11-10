import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Box,
  CheckCircle2,
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import {
  isServerActiveStatus,
  MOD_LOAD_TARGET,
  MOD_SOURCE_TYPE,
  type ModLoadTarget,
  type ModSyncStatus,
  type ServerModDto,
  type ServerModsListResponseDto,
  type ServerStatus,
} from '@aegis/api-contracts';
import {
  Button,
  Confirmation,
  DotsFloatingMenu,
  type DotsFloatingMenuOption,
  Input,
  Notice,
  Select,
  type SelectOption,
  StatusTag,
  type StatusTagStatus,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Toggle,
  useSortableList,
} from '@aegis/ui';
import { EmptyServersState, PageContainer } from '@aegis/web/components';
import {
  getServerStatusPresentation,
  notifyApiError,
  notifySuccess,
  useActiveServer,
} from '@aegis/web/core';

import { useAuth } from '../auth';
import { CreateServerModal } from '../server-settings';

import { AddModModal } from './components/AddModModal';
import { EditModModal } from './components/EditModModal';
import { LaunchParamsPreviewCard } from './components/LaunchParamsPreviewCard';
import { modsQueries, modsQueryKeys } from './mods.queries';

type StatusFilter = 'all' | ModSyncStatus;
type TargetFilter = 'all' | 'client_server' | 'server_only';

const STATUS_FILTER_OPTIONS: SelectOption<StatusFilter>[] = [
  { value: 'all', label: 'All sync statuses' },
  { value: 'up_to_date', label: 'Up to date' },
  { value: 'update_available', label: 'Update available' },
  { value: 'not_synced', label: 'Not synced' },
  { value: 'local', label: 'Local' },
];

const TARGET_FILTER_OPTIONS: SelectOption<TargetFilter>[] = [
  { value: 'all', label: 'All targets' },
  { value: 'client_server', label: 'Client & Server (-mod=)' },
  { value: 'server_only', label: 'Server Only (-serverMod=)' },
];

function getSyncBadgeProps(syncStatus: ModSyncStatus): {
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

function getTargetLabel(target: ModLoadTarget): {
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

function formatByteSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

function buildModRowMenuOptions(params: {
  mod: ServerModDto;
  index: number;
  totalMods: number;
  isServerLocked: boolean;
  canReorder: boolean;
  onEdit: () => void;
  onMarkSynced: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}): DotsFloatingMenuOption[] {
  const {
    mod,
    index,
    totalMods,
    isServerLocked,
    canReorder,
    onEdit,
    onMarkSynced,
    onMoveUp,
    onMoveDown,
    onDelete,
  } = params;

  const options: DotsFloatingMenuOption[] = [
    {
      label: 'Edit',
      icon: <Pencil className="w-3.5 h-3.5" />,
      disabled: isServerLocked,
      onSelect: onEdit,
    },
  ];

  if (mod.sourceType === MOD_SOURCE_TYPE.WORKSHOP) {
    options.push({
      label: 'Mark as synced',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      disabled: isServerLocked,
      onSelect: onMarkSynced,
    });
  }

  options.push(
    {
      label: 'Move up',
      icon: <ArrowUp className="w-3.5 h-3.5" />,
      disabled: !canReorder || index === 0,
      onSelect: onMoveUp,
    },
    {
      label: 'Move down',
      icon: <ArrowDown className="w-3.5 h-3.5" />,
      disabled: !canReorder || index >= totalMods - 1,
      onSelect: onMoveDown,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      destructive: true,
      disabled: isServerLocked,
      onSelect: onDelete,
    },
  );

  return options;
}

function ModsHeader({
  serverName,
  serverStatus,
  isAdmin,
  isServerLocked,
  isCheckingUpdates,
  onCheckUpdates,
  onOpenAddModal,
}: {
  serverName: string;
  serverStatus: ServerStatus;
  isAdmin: boolean;
  isServerLocked: boolean;
  isCheckingUpdates: boolean;
  onCheckUpdates: () => void;
  onOpenAddModal: () => void;
}) {
  const statusPresentation = getServerStatusPresentation(serverStatus);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
            Mods Management
          </h1>
          <StatusTag status={statusPresentation.tagStatus} label={statusPresentation.label} />
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Curate Steam Workshop and local mods, sequence load order, and preview launch flags for{' '}
          <span className="font-semibold text-[var(--color-text-main)]">{serverName}</span>.
        </p>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={RefreshCw}
            isLoading={isCheckingUpdates}
            onClick={onCheckUpdates}
          >
            Check for updates
          </Button>
          <Button
            variant="primary"
            leftIcon={Plus}
            disabled={isServerLocked}
            onClick={onOpenAddModal}
          >
            Add Mod
          </Button>
        </div>
      )}
    </div>
  );
}

function ModsStatusBanners({
  serverStatus,
  isServerLocked,
  updateAvailableCount,
  isFiltered,
  isAdmin,
}: {
  serverStatus: ServerStatus;
  isServerLocked: boolean;
  updateAvailableCount: number;
  isFiltered: boolean;
  isAdmin: boolean;
}) {
  return (
    <>
      {isServerLocked && (
        <Notice variant="warning" title="Server is Active — Mod Configuration Locked">
          This server is currently <strong className="uppercase">{serverStatus}</strong>. Adding,
          editing, toggling, reordering, and deleting mods are disabled while the process is active.
          You may still check for Steam Workshop updates.
        </Notice>
      )}

      {updateAvailableCount > 0 && (
        <Notice variant="info" title="Workshop Updates Available">
          {updateAvailableCount} update(s) available on Steam Workshop compared to your recorded
          sync timestamps.
        </Notice>
      )}

      {isFiltered && isAdmin && !isServerLocked && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Load order drag-and-drop and move controls are disabled while search or status filters are
          active.
        </p>
      )}
    </>
  );
}

function ModsEmptyRow({
  hasAnyMods,
  isAdmin,
  isServerLocked,
  onOpenAddModal,
}: {
  hasAnyMods: boolean;
  isAdmin: boolean;
  isServerLocked: boolean;
  onOpenAddModal: () => void;
}) {
  return (
    <TableEmpty
      colSpan={isAdmin ? 8 : 7}
      icon={<Box className="w-5 h-5" />}
      title={hasAnyMods ? 'No matching mods' : 'No mods configured'}
      description={
        hasAnyMods
          ? 'Try clearing your search query or status filters.'
          : 'Add Steam Workshop items, collections, or local mods to build your server load order.'
      }
      action={
        !hasAnyMods && isAdmin ? (
          <Button
            variant="primary"
            leftIcon={Plus}
            disabled={isServerLocked}
            onClick={onOpenAddModal}
          >
            Add Mod
          </Button>
        ) : undefined
      }
    />
  );
}

function getDropBorderClass(dropIndicator: 'above' | 'below' | null): string {
  if (dropIndicator === 'above') return 'border-t-2 border-t-[var(--color-primary)]';
  if (dropIndicator === 'below') return 'border-b-2 border-b-[var(--color-primary)]';
  return '';
}

interface ModTableRowProps {
  mod: ServerModDto;
  index: number;
  totalMods: number;
  isAdmin: boolean;
  isServerLocked: boolean;
  canReorder: boolean;
  isDragging: boolean;
  dropIndicator: 'above' | 'below' | null;
  itemProps: ReturnType<typeof useSortableList<ServerModDto>>['getItemProps'] extends (
    id: string,
  ) => infer R
    ? R
    : never;
  handleProps: ReturnType<typeof useSortableList<ServerModDto>>['getHandleProps'] extends (
    id: string,
  ) => infer R
    ? R
    : never;
  onToggleEnabled: (enabled: boolean) => void;
  onEdit: () => void;
  onMarkSynced: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function ModTableRow({
  mod,
  index,
  totalMods,
  isAdmin,
  isServerLocked,
  canReorder,
  isDragging,
  dropIndicator,
  itemProps,
  handleProps,
  onToggleEnabled,
  onEdit,
  onMarkSynced,
  onMoveUp,
  onMoveDown,
  onDelete,
}: ModTableRowProps) {
  const badge = getSyncBadgeProps(mod.syncStatus);
  const targetTag = getTargetLabel(mod.loadTarget);
  const dropBorderClass = getDropBorderClass(dropIndicator);

  return (
    <TableRow
      {...itemProps}
      className={`${isDragging ? 'opacity-50' : ''} ${dropBorderClass}`.trim()}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Reorder ${mod.name}`}
            disabled={!canReorder}
            {...handleProps}
            className={`p-1 rounded text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] ${
              canReorder
                ? 'cursor-grab hover:text-[var(--color-text-main)]'
                : 'cursor-not-allowed opacity-40'
            }`}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-[var(--color-text-muted)]">
            #{mod.loadOrder + 1}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <Toggle
          checked={mod.enabled}
          disabled={!isAdmin || isServerLocked}
          aria-label={`Enable ${mod.name}`}
          onChange={e => onToggleEnabled(e.target.checked)}
        />
      </TableCell>

      <TableCell>
        <div className="space-y-0.5">
          <div className="font-semibold text-[var(--color-text-main)]">{mod.name}</div>
          {mod.workshopUrl && mod.workshopId ? (
            <a
              href={mod.workshopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--color-primary)] hover:underline"
            >
              Workshop #{mod.workshopId}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-[11px] text-[var(--color-text-muted)]">Local directory mod</span>
          )}
        </div>
      </TableCell>

      <TableCell>
        {mod.folderName ? (
          <code className="font-mono text-xs text-[var(--color-text-main)]">{mod.folderName}</code>
        ) : (
          <span className="text-xs italic text-[var(--color-status-warning)]">Missing @folder</span>
        )}
      </TableCell>

      <TableCell>
        <Tag variant="subtle" color={targetTag.color}>
          {targetTag.label}
        </Tag>
      </TableCell>

      <TableCell>
        <span className="font-mono text-xs text-[var(--color-text-secondary)]">
          {formatByteSize(mod.sizeBytes)}
        </span>
      </TableCell>

      <TableCell>
        <StatusTag status={badge.status} label={badge.label} />
      </TableCell>

      {isAdmin && (
        <TableCell align="right">
          <DotsFloatingMenu
            ariaLabel={`Actions for ${mod.name}`}
            options={buildModRowMenuOptions({
              mod,
              index,
              totalMods,
              isServerLocked,
              canReorder,
              onEdit,
              onMarkSynced,
              onMoveUp,
              onMoveDown,
              onDelete,
            })}
          />
        </TableCell>
      )}
    </TableRow>
  );
}

export function ModsView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { servers, activeServer, activeServerId, isLoading: isServersLoading } = useActiveServer();

  const [isCreateServerOpen, setIsCreateServerOpen] = useState(false);
  const [isAddModOpen, setIsAddModOpen] = useState(false);
  const [editingMod, setEditingMod] = useState<ServerModDto | null>(null);
  const [deletingMod, setDeletingMod] = useState<ServerModDto | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all');

  const isAdmin = user?.role === 'admin';
  const serverId = activeServerId ?? '';

  const {
    data: modsResponse,
    isLoading: isModsLoading,
    error: modsError,
  } = useQuery({
    ...modsQueries.list(serverId),
    enabled: Boolean(serverId),
  });

  const mods = useMemo(() => modsResponse?.mods ?? [], [modsResponse]);

  const installedWorkshopIds = useMemo(
    () => new Set(mods.map(m => m.workshopId).filter((id): id is string => Boolean(id))),
    [mods],
  );

  const filteredMods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mods.filter(mod => {
      if (statusFilter !== 'all' && mod.syncStatus !== statusFilter) return false;
      if (targetFilter !== 'all' && mod.loadTarget !== targetFilter) return false;
      if (!q) return true;
      return (
        mod.name.toLowerCase().includes(q) ||
        mod.folderName.toLowerCase().includes(q) ||
        (mod.workshopId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [mods, searchQuery, statusFilter, targetFilter]);

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'all' || targetFilter !== 'all';
  const isServerLocked = activeServer ? isServerActiveStatus(activeServer.status) : false;
  const canReorder = isAdmin && !isServerLocked && !isFiltered && mods.length > 1;

  const toggleMutation = useMutation({
    mutationFn: ({ modId, enabled }: { modId: string; enabled: boolean }) =>
      apiClient.mods.update(serverId, modId, { enabled }),
    onSuccess: updated => {
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifySuccess(updated.enabled ? 'MOD_ENABLED' : 'MOD_DISABLED', { name: updated.name });
    },
    onError: (err: Error) => notifyApiError(err, 'Failed to Toggle Mod'),
  });

  const markSyncedMutation = useMutation({
    mutationFn: (mod: ServerModDto) =>
      apiClient.mods.update(serverId, mod.id, { markSynced: true }),
    onSuccess: updated => {
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifySuccess('MOD_MARKED_SYNCED', { name: updated.name });
    },
    onError: (err: Error) => notifyApiError(err, 'Failed to Mark Mod as Synced'),
  });

  const deleteMutation = useMutation({
    mutationFn: (mod: ServerModDto) => apiClient.mods.delete(serverId, mod.id),
    onSuccess: (_res, mod) => {
      setDeletingMod(null);
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifySuccess('MOD_DELETED', { name: mod.name });
    },
    onError: (err: Error) => {
      setDeletingMod(null);
      notifyApiError(err, 'Failed to Remove Mod');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (modIds: string[]) => apiClient.mods.reorder(serverId, { modIds }),
    onMutate: async modIds => {
      await queryClient.cancelQueries({ queryKey: modsQueryKeys.list(serverId) });
      const previous = queryClient.getQueryData<ServerModsListResponseDto>(
        modsQueryKeys.list(serverId),
      );
      if (previous) {
        const byId = new Map(previous.mods.map(m => [m.id, m]));
        const reordered = modIds
          .map((id, idx) => {
            const found = byId.get(id);
            return found ? { ...found, loadOrder: idx } : null;
          })
          .filter((item): item is ServerModDto => item !== null);
        queryClient.setQueryData<ServerModsListResponseDto>(modsQueryKeys.list(serverId), {
          ...previous,
          mods: reordered,
        });
      }
      return { previous };
    },
    onSuccess: updated => {
      queryClient.setQueryData(modsQueryKeys.list(serverId), updated);
      notifySuccess('MODS_REORDERED');
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(modsQueryKeys.list(serverId), context.previous);
      }
      notifyApiError(err, 'Failed to Save Load Order');
    },
  });

  const checkUpdatesMutation = useMutation({
    mutationFn: () => apiClient.mods.checkUpdates(serverId),
    onSuccess: result => {
      queryClient.setQueryData(modsQueryKeys.list(serverId), result);
      notifySuccess('MOD_UPDATES_CHECKED', { count: result.updateAvailableCount });
    },
    onError: (err: Error) => notifyApiError(err, 'Update Check Failed'),
  });

  const { isItemDragging, getItemDropIndicator, moveItem, getItemProps, getHandleProps } =
    useSortableList({
      items: mods,
      getId: mod => mod.id,
      disabled: !canReorder,
      onReorder: reordered => {
        if (reordered.every((m, idx) => m.id === mods[idx]?.id)) return;
        reorderMutation.mutate(reordered.map(m => m.id));
      },
    });

  if (isServersLoading || (Boolean(serverId) && isModsLoading)) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="h-8 w-64 bg-[var(--color-surface-subtle)] animate-pulse rounded" />
          <div className="h-64 bg-[var(--color-surface-subtle)] animate-pulse rounded-2xl" />
          <div className="h-40 bg-[var(--color-surface-subtle)] animate-pulse rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  if (servers.length === 0) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <EmptyServersState onAddServer={() => setIsCreateServerOpen(true)} />
          <CreateServerModal
            isOpen={isCreateServerOpen}
            onClose={() => setIsCreateServerOpen(false)}
          />
        </div>
      </PageContainer>
    );
  }

  if (modsError || !activeServer || !modsResponse) {
    return (
      <PageContainer>
        <Notice variant="error" title="Unable to Load Server Mods">
          Could not retrieve the mod inventory for the selected server. Please try again.
        </Notice>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <ModsHeader
          serverName={activeServer.name}
          serverStatus={activeServer.status}
          isAdmin={isAdmin}
          isServerLocked={isServerLocked}
          isCheckingUpdates={checkUpdatesMutation.isPending}
          onCheckUpdates={() => checkUpdatesMutation.mutate()}
          onOpenAddModal={() => setIsAddModOpen(true)}
        />

        <ModsStatusBanners
          serverStatus={activeServer.status}
          isServerLocked={isServerLocked}
          updateAvailableCount={modsResponse.updateAvailableCount}
          isFiltered={isFiltered}
          isAdmin={isAdmin}
        />

        <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
          <div className="flex-1">
            <Input
              aria-label="Filter mods"
              placeholder="Search by mod name, @folder, or Workshop ID..."
              leftIcon={Search}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-52">
            <Select
              aria-label="Filter by sync status"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={val => setStatusFilter(val ?? 'all')}
            />
          </div>
          <div className="w-full md:w-56">
            <Select
              aria-label="Filter by load target"
              options={TARGET_FILTER_OPTIONS}
              value={targetFilter}
              onChange={val => setTargetFilter(val ?? 'all')}
            />
          </div>
        </div>

        <Table aria-label="Server mods inventory">
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead>Mod</TableHead>
              <TableHead>@Folder</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Sync Status</TableHead>
              {isAdmin && <TableHead align="right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMods.length === 0 ? (
              <ModsEmptyRow
                hasAnyMods={mods.length > 0}
                isAdmin={isAdmin}
                isServerLocked={isServerLocked}
                onOpenAddModal={() => setIsAddModOpen(true)}
              />
            ) : (
              filteredMods.map((mod, idx) => (
                <ModTableRow
                  key={mod.id}
                  mod={mod}
                  index={idx}
                  totalMods={mods.length}
                  isAdmin={isAdmin}
                  isServerLocked={isServerLocked}
                  canReorder={canReorder}
                  isDragging={isItemDragging(mod.id)}
                  dropIndicator={getItemDropIndicator(mod.id)}
                  itemProps={getItemProps(mod.id)}
                  handleProps={getHandleProps(mod.id)}
                  onToggleEnabled={enabled => toggleMutation.mutate({ modId: mod.id, enabled })}
                  onEdit={() => setEditingMod(mod)}
                  onMarkSynced={() => markSyncedMutation.mutate(mod)}
                  onMoveUp={() => moveItem(mod.id, 'up')}
                  onMoveDown={() => moveItem(mod.id, 'down')}
                  onDelete={() => setDeletingMod(mod)}
                />
              ))
            )}
          </TableBody>
        </Table>

        <LaunchParamsPreviewCard launchPreview={modsResponse.launchPreview} />

        {isAdmin && (
          <>
            <AddModModal
              isOpen={isAddModOpen}
              serverId={serverId}
              installedWorkshopIds={installedWorkshopIds}
              onClose={() => setIsAddModOpen(false)}
            />

            <EditModModal
              isOpen={Boolean(editingMod)}
              mod={editingMod}
              serverId={serverId}
              isServerLocked={isServerLocked}
              onClose={() => setEditingMod(null)}
            />

            {deletingMod && (
              <Confirmation
                title="Remove Mod from Server"
                description={`Remove "${deletingMod.name}" from ${activeServer.name}? Load order will be re-indexed automatically.`}
                variant="danger"
                confirmLabel="Remove Mod"
                cancelLabel="Cancel"
                isLoading={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutate(deletingMod)}
                onCancel={() => setDeletingMod(null)}
              />
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
