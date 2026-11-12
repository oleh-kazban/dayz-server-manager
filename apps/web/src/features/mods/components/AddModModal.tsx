import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ExternalLink, FolderPlus, Link2, PackagePlus, Search, X } from 'lucide-react';

import { apiClient, ApiError } from '@aegis/api-client';
import {
  type AddServerModDto,
  type BatchAddServerModsDto,
  MOD_LOAD_TARGET,
  MOD_SOURCE_TYPE,
  type ModLoadTarget,
  WORKSHOP_SEARCH_MAX_PAGE,
  type WorkshopLookupResponseDto,
  type WorkshopResolvedItemDto,
  type WorkshopSearchResponseDto,
} from '@aegis/api-contracts';
import {
  Button,
  Checkbox,
  Input,
  Notice,
  Pagination,
  Select,
  type SelectOption,
  TabContent,
  Tabs,
  Tag,
  Toggle,
} from '@aegis/ui';
import {
  extractApiFieldErrors,
  notifyApiError,
  notifySuccess,
  resolveFieldErrors,
  useModalDialog,
} from '@aegis/web/core';

import { modsQueryKeys } from '../mods.queries';

export interface AddModModalProps {
  isOpen: boolean;
  serverId: string;
  installedWorkshopIds: Set<string>;
  onClose: () => void;
}

const LOAD_TARGET_OPTIONS: SelectOption<ModLoadTarget>[] = [
  { value: MOD_LOAD_TARGET.CLIENT_SERVER, label: 'Client & Server (-mod=)' },
  { value: MOD_LOAD_TARGET.SERVER_ONLY, label: 'Server Only (-serverMod=)' },
];

type AddModTab = 'url' | 'search' | 'local';

const MODAL_TITLE_BY_TARGET: Record<ModLoadTarget, string> = {
  [MOD_LOAD_TARGET.CLIENT_SERVER]: 'Add Client & Server Mod',
  [MOD_LOAD_TARGET.SERVER_ONLY]: 'Add Server-Only Mod',
  [MOD_LOAD_TARGET.CLIENT_OPTIONAL]: 'Add Client-Optional Mod',
};

const MODAL_TAB_ITEMS = [
  { id: 'url', label: 'URL / ID / Collection', icon: <Link2 className="w-3.5 h-3.5" /> },
  { id: 'search', label: 'Search Workshop', icon: <Search className="w-3.5 h-3.5" /> },
  { id: 'local', label: 'Local Mod', icon: <FolderPlus className="w-3.5 h-3.5" /> },
];

function formatModSize(sizeBytes: number | null): string {
  if (sizeBytes === null || sizeBytes <= 0) return 'Unknown size';
  const mb = sizeBytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function toggleIdInSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

function validateLocalModForm(name: string, folderName: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!name.trim()) {
    errors.name = 'Mod name is required.';
  }
  const trimmedFolder = folderName.trim();
  if (!trimmedFolder) {
    errors.folderName = 'Mod folder name is required.';
  } else if (!trimmedFolder.startsWith('@') || trimmedFolder.length < 2) {
    errors.folderName = 'Mod folder name must start with @ and include at least one character.';
  } else if (trimmedFolder.includes('..') || /[;/\\\0]/.test(trimmedFolder)) {
    errors.folderName = 'Mod folder name contains forbidden characters.';
  }
  return errors;
}

function ResolvedWorkshopItemList({
  items,
  installedWorkshopIds,
  selectedIds,
  onToggleItem,
}: {
  items: WorkshopResolvedItemDto[];
  installedWorkshopIds: Set<string>;
  selectedIds: Set<string>;
  onToggleItem: (workshopId: string) => void;
}) {
  return (
    <div className="max-h-60 overflow-y-auto divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      {items.map(item => {
        const isInstalled = installedWorkshopIds.has(item.workshopId);
        const isChecked = isInstalled || selectedIds.has(item.workshopId);
        return (
          <div
            key={item.workshopId}
            className="flex items-start justify-between gap-3 p-3 hover:bg-[var(--color-surface-subtle)]/40"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Checkbox
                checked={isChecked}
                disabled={isInstalled}
                aria-label={`Select ${item.name}`}
                onChange={() => onToggleItem(item.workshopId)}
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                  {item.name}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-[var(--color-text-muted)] font-mono">
                  <span>ID: {item.workshopId}</span>
                  <span>•</span>
                  <span>{item.suggestedFolderName}</span>
                  <span>•</span>
                  <span>{formatModSize(item.sizeBytes)}</span>
                </div>
              </div>
            </div>
            {isInstalled && (
              <Tag variant="subtle" color="default">
                Already added
              </Tag>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UrlLookupTab({
  serverId,
  installedWorkshopIds,
  loadTarget,
  onLoadTargetChange,
  onClose,
}: {
  serverId: string;
  installedWorkshopIds: Set<string>;
  loadTarget: ModLoadTarget;
  onLoadTargetChange: (target: ModLoadTarget) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const lookupInFlightRef = useRef(false);
  const addInFlightRef = useRef(false);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | undefined>();
  const [lookupResult, setLookupResult] = useState<WorkshopLookupResponseDto | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [markAsInstalled, setMarkAsInstalled] = useState(false);

  const lookupMutation = useMutation({
    mutationFn: (value: string) => apiClient.mods.lookupWorkshop({ input: value }),
    onSuccess: data => {
      setLookupResult(data);
      const selectable = data.items
        .filter(item => !installedWorkshopIds.has(item.workshopId))
        .map(item => item.workshopId);
      setSelectedIds(new Set(selectable));
      setInputError(undefined);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.errorCode === 'STEAM_WORKSHOP_INVALID_INPUT') {
        setInputError('Enter a numeric Workshop ID or a steamcommunity.com Workshop URL.');
        return;
      }
      notifyApiError(err, 'Workshop Lookup Failed');
    },
    onSettled: () => {
      lookupInFlightRef.current = false;
    },
  });

  const addSingleMutation = useMutation({
    mutationFn: (dto: AddServerModDto) => apiClient.mods.add(serverId, dto),
    onSuccess: created => {
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifySuccess('MOD_ADDED', { name: created.name });
      onClose();
    },
    onError: (err: Error) => notifyApiError(err, 'Failed to Add Mod'),
    onSettled: () => {
      addInFlightRef.current = false;
    },
  });

  const batchAddMutation = useMutation({
    mutationFn: (dto: BatchAddServerModsDto) => apiClient.mods.batchAdd(serverId, dto),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifySuccess('MODS_BATCH_ADDED', {
        addedCount: result.added.length,
        skippedCount: result.skippedCount,
      });
      onClose();
    },
    onError: (err: Error) => notifyApiError(err, 'Failed to Import Collection'),
    onSettled: () => {
      addInFlightRef.current = false;
    },
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupMutation.isPending || lookupInFlightRef.current) return;
    const trimmed = input.trim();
    if (!trimmed) {
      setInputError('Enter a Steam Workshop URL or PublishedFileId.');
      return;
    }
    setInputError(undefined);
    lookupInFlightRef.current = true;
    lookupMutation.mutate(trimmed);
  };

  const toggleItem = (workshopId: string) => {
    setSelectedIds(prev => toggleIdInSet(prev, workshopId));
  };

  const selectedItems =
    lookupResult?.items.filter(
      item => selectedIds.has(item.workshopId) && !installedWorkshopIds.has(item.workshopId),
    ) ?? [];

  const handleAddSelected = () => {
    if (
      selectedItems.length === 0 ||
      addSingleMutation.isPending ||
      batchAddMutation.isPending ||
      addInFlightRef.current
    ) {
      return;
    }

    addInFlightRef.current = true;
    if (selectedItems.length === 1) {
      const item = selectedItems[0];
      addSingleMutation.mutate({
        sourceType: MOD_SOURCE_TYPE.WORKSHOP,
        workshopId: item.workshopId,
        name: item.name,
        folderName: item.suggestedFolderName,
        loadTarget,
        enabled: true,
        sizeBytes: item.sizeBytes,
        remoteUpdatedAt: item.remoteUpdatedAt,
        markAsInstalled,
      });
      return;
    }

    batchAddMutation.mutate({
      mods: selectedItems.map(item => ({
        sourceType: MOD_SOURCE_TYPE.WORKSHOP,
        workshopId: item.workshopId,
        name: item.name,
        folderName: item.suggestedFolderName,
        loadTarget,
        enabled: true,
        sizeBytes: item.sizeBytes,
        remoteUpdatedAt: item.remoteUpdatedAt,
        markAsInstalled,
      })),
    });
  };

  const isSubmitting = addSingleMutation.isPending || batchAddMutation.isPending;

  return (
    <div className="space-y-4">
      <form noValidate onSubmit={handleLookup} className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            label="Steam Workshop URL or PublishedFileId"
            placeholder="e.g. 1559212036 or https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036"
            value={input}
            error={inputError}
            onChange={e => {
              setInput(e.target.value);
              if (inputError) setInputError(undefined);
            }}
          />
        </div>
        <div className="pt-6">
          <Button variant="secondary" type="submit" isLoading={lookupMutation.isPending}>
            Lookup
          </Button>
        </div>
      </form>

      {lookupResult && (
        <div className="space-y-3">
          {lookupResult.kind === 'collection' && (
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>
                Collection:{' '}
                <strong className="text-[var(--color-text-main)]">
                  {lookupResult.collectionTitle ?? 'Steam Workshop Collection'}
                </strong>
              </span>
              <span>{lookupResult.items.length} DayZ mod(s) resolved</span>
            </div>
          )}

          {lookupResult.skippedCount > 0 && (
            <Notice variant="warning" title="Non-DayZ Items Filtered">
              {lookupResult.skippedCount} item(s) were skipped because they do not target DayZ
              (AppID 221100) or are unavailable.
            </Notice>
          )}

          {lookupResult.items.length > 0 && (
            <>
              <ResolvedWorkshopItemList
                items={lookupResult.items}
                installedWorkshopIds={installedWorkshopIds}
                selectedIds={selectedIds}
                onToggleItem={toggleItem}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Select
                  label="Load Target"
                  options={LOAD_TARGET_OPTIONS}
                  value={loadTarget}
                  onChange={val => {
                    if (val) onLoadTargetChange(val);
                  }}
                />
                <div className="flex items-end pb-1">
                  <Toggle
                    label="Mark as already installed"
                    description="Initialize sync status as Up to date instead of Not synced"
                    checked={markAsInstalled}
                    onChange={e => setMarkAsInstalled(e.target.checked)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="button"
          disabled={selectedItems.length === 0}
          isLoading={isSubmitting}
          onClick={handleAddSelected}
        >
          {selectedItems.length > 1 ? `Add ${selectedItems.length} Mods` : 'Add Selected Mod'}
        </Button>
      </div>
    </div>
  );
}

function WorkshopSearchTab({
  serverId,
  installedWorkshopIds,
  loadTarget,
  onLoadTargetChange,
  onClose,
}: {
  serverId: string;
  installedWorkshopIds: Set<string>;
  loadTarget: ModLoadTarget;
  onLoadTargetChange: (target: ModLoadTarget) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const searchInFlightRef = useRef(false);
  const batchAddInFlightRef = useRef(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [searchResult, setSearchResult] = useState<WorkshopSearchResponseDto | null>(null);
  const [missingApiKey, setMissingApiKey] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [markAsInstalled, setMarkAsInstalled] = useState(false);

  const pageSize = 10;

  const searchMutation = useMutation({
    mutationFn: (params: { q: string; page: number }) =>
      apiClient.mods.searchWorkshop({ q: params.q, page: params.page, pageSize }),
    onSuccess: data => {
      setMissingApiKey(false);
      setSearchResult(data);
      setPage(data.page);
      setSelectedIds(new Set());
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.errorCode === 'STEAM_WEB_API_KEY_REQUIRED') {
        setMissingApiKey(true);
        setSearchResult(null);
        return;
      }
      notifyApiError(err, 'Workshop Search Failed');
    },
    onSettled: () => {
      searchInFlightRef.current = false;
    },
  });

  const batchAddMutation = useMutation({
    mutationFn: (dto: BatchAddServerModsDto) => apiClient.mods.batchAdd(serverId, dto),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifySuccess('MODS_BATCH_ADDED', {
        addedCount: result.added.length,
        skippedCount: result.skippedCount,
      });
      onClose();
    },
    onError: (err: Error) => notifyApiError(err, 'Failed to Add Selected Mods'),
    onSettled: () => {
      batchAddInFlightRef.current = false;
    },
  });

  const handleSearch = (targetPage: number) => {
    if (searchMutation.isPending || searchInFlightRef.current) return;
    searchInFlightRef.current = true;
    searchMutation.mutate({ q: query.trim(), page: targetPage });
  };

  const handleBatchAdd = () => {
    if (selectedItems.length === 0 || batchAddMutation.isPending || batchAddInFlightRef.current) {
      return;
    }
    batchAddInFlightRef.current = true;
    batchAddMutation.mutate({
      mods: selectedItems.map(item => ({
        sourceType: MOD_SOURCE_TYPE.WORKSHOP,
        workshopId: item.workshopId,
        name: item.name,
        folderName: item.suggestedFolderName,
        loadTarget,
        enabled: true,
        sizeBytes: item.sizeBytes,
        remoteUpdatedAt: item.remoteUpdatedAt,
        markAsInstalled,
      })),
    });
  };

  const toggleItem = (workshopId: string) => {
    setSelectedIds(prev => toggleIdInSet(prev, workshopId));
  };

  const selectedItems =
    searchResult?.items.filter(
      item => selectedIds.has(item.workshopId) && !installedWorkshopIds.has(item.workshopId),
    ) ?? [];

  const totalPages = searchResult
    ? Math.min(WORKSHOP_SEARCH_MAX_PAGE, Math.max(1, Math.ceil(searchResult.total / pageSize)))
    : 1;

  return (
    <div className="space-y-4">
      <form
        noValidate
        onSubmit={e => {
          e.preventDefault();
          handleSearch(1);
        }}
        className="flex items-start gap-2"
      >
        <div className="flex-1">
          <Input
            label="Search DayZ Steam Workshop"
            placeholder="e.g. CF, Community Online Tools, Trader..."
            value={query}
            leftIcon={Search}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="pt-6">
          <Button variant="secondary" type="submit" isLoading={searchMutation.isPending}>
            Search
          </Button>
        </div>
      </form>

      {missingApiKey && (
        <Notice
          variant="warning"
          title="Steam Web API Key Required"
          action={
            <Link
              to="/settings/steam"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Configure Steam Web API Key in Steam Settings
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          }
        >
          Workshop keyword search requires a Steam Web API Key encrypted in the DSM appliance vault.
          You can still add mods anytime via the URL / ID / Collection tab without a key.
        </Notice>
      )}

      {searchResult && (
        <div className="space-y-3">
          {searchResult.items.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">
              No matching DayZ Workshop items found.
            </p>
          ) : (
            <>
              <ResolvedWorkshopItemList
                items={searchResult.items}
                installedWorkshopIds={installedWorkshopIds}
                selectedIds={selectedIds}
                onToggleItem={toggleItem}
              />

              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={searchResult.total}
                pageSize={pageSize}
                siblingCount={1}
                disabled={searchMutation.isPending}
                onPageChange={nextPage => handleSearch(nextPage)}
                className="flex-wrap gap-y-2"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <Select
                  label="Load Target"
                  options={LOAD_TARGET_OPTIONS}
                  value={loadTarget}
                  onChange={val => {
                    if (val) onLoadTargetChange(val);
                  }}
                />
                <div className="flex items-end pb-1">
                  <Toggle
                    label="Mark as already installed"
                    description="Initialize sync status as Up to date"
                    checked={markAsInstalled}
                    onChange={e => setMarkAsInstalled(e.target.checked)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="button"
          disabled={selectedItems.length === 0}
          isLoading={batchAddMutation.isPending}
          onClick={handleBatchAdd}
        >
          {selectedItems.length > 0 ? `Add ${selectedItems.length} Mod(s)` : 'Add Selected'}
        </Button>
      </div>
    </div>
  );
}

function LocalModTab({
  serverId,
  loadTarget,
  onLoadTargetChange,
  onClose,
}: {
  serverId: string;
  loadTarget: ModLoadTarget;
  onLoadTargetChange: (target: ModLoadTarget) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);
  const [name, setName] = useState('');
  const [folderName, setFolderName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const addLocalMutation = useMutation({
    mutationFn: (dto: AddServerModDto) => apiClient.mods.add(serverId, dto),
    onSuccess: created => {
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifySuccess('MOD_ADDED', { name: created.name });
      onClose();
    },
    onError: (err: Error) => {
      const resolved = resolveFieldErrors(extractApiFieldErrors(err));
      if (Object.keys(resolved).length > 0) {
        setFieldErrors(resolved);
        return;
      }
      notifyApiError(err, 'Failed to Add Local Mod');
    },
    onSettled: () => {
      inFlightRef.current = false;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addLocalMutation.isPending || inFlightRef.current) return;
    const errors = validateLocalModForm(name, folderName);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    inFlightRef.current = true;
    addLocalMutation.mutate({
      sourceType: MOD_SOURCE_TYPE.LOCAL,
      name: name.trim(),
      folderName: folderName.trim(),
      loadTarget,
      enabled: true,
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Mod Name"
        placeholder="e.g. Server Custom Scripts"
        value={name}
        error={fieldErrors.name}
        onChange={e => {
          setName(e.target.value);
          clearFieldError('name');
        }}
      />

      <div className="space-y-1">
        <Input
          label="@Folder Name"
          placeholder="e.g. @ServerCustomScripts"
          value={folderName}
          error={fieldErrors.folderName}
          onChange={e => {
            setFolderName(e.target.value);
            clearFieldError('folderName');
          }}
        />
        <p className="text-xs text-[var(--color-text-muted)]">
          Must start with @ and match the directory inside your server install folder.
        </p>
      </div>

      <Select
        label="Load Target"
        options={LOAD_TARGET_OPTIONS}
        value={loadTarget}
        onChange={val => {
          if (val) onLoadTargetChange(val);
        }}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={addLocalMutation.isPending}>
          Add Local Mod
        </Button>
      </div>
    </form>
  );
}

function AddModDialog({
  serverId,
  installedWorkshopIds,
  onClose,
}: Omit<AddModModalProps, 'isOpen'>) {
  const [activeTab, setActiveTab] = useState<AddModTab>('url');
  const [loadTargetByTab, setLoadTargetByTab] = useState<Record<AddModTab, ModLoadTarget>>({
    url: MOD_LOAD_TARGET.CLIENT_SERVER,
    search: MOD_LOAD_TARGET.CLIENT_SERVER,
    local: MOD_LOAD_TARGET.SERVER_ONLY,
  });

  const { dialogRef, handleBackdropClick } = useModalDialog({ onClose });

  const updateTabLoadTarget = (tab: AddModTab, target: ModLoadTarget) => {
    setLoadTargetByTab(prev => ({ ...prev, [tab]: target }));
  };

  const modalTitle = MODAL_TITLE_BY_TARGET[loadTargetByTab[activeTab]];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-mod-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 space-y-5"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="add-mod-title"
                className="text-lg font-semibold text-[var(--color-text-main)]"
              >
                {modalTitle}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Resolve a Steam Workshop item or collection, search Workshop, or register a local
                mod
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            isIconOnly
            leftIcon={X}
            aria-label="Close dialog"
            onClick={onClose}
          />
        </div>

        <Tabs
          value={activeTab}
          onChange={val => setActiveTab(val as AddModTab)}
          items={MODAL_TAB_ITEMS}
          aria-label="Add mod source"
        >
          <TabContent value="url">
            <UrlLookupTab
              serverId={serverId}
              installedWorkshopIds={installedWorkshopIds}
              loadTarget={loadTargetByTab.url}
              onLoadTargetChange={target => updateTabLoadTarget('url', target)}
              onClose={onClose}
            />
          </TabContent>
          <TabContent value="search">
            <WorkshopSearchTab
              serverId={serverId}
              installedWorkshopIds={installedWorkshopIds}
              loadTarget={loadTargetByTab.search}
              onLoadTargetChange={target => updateTabLoadTarget('search', target)}
              onClose={onClose}
            />
          </TabContent>
          <TabContent value="local">
            <LocalModTab
              serverId={serverId}
              loadTarget={loadTargetByTab.local}
              onLoadTargetChange={target => updateTabLoadTarget('local', target)}
              onClose={onClose}
            />
          </TabContent>
        </Tabs>
      </div>
    </div>
  );
}

export function AddModModal({ isOpen, serverId, installedWorkshopIds, onClose }: AddModModalProps) {
  if (!isOpen) return null;
  return (
    <AddModDialog
      serverId={serverId}
      installedWorkshopIds={installedWorkshopIds}
      onClose={onClose}
    />
  );
}
