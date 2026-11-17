import { useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Upload, X } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import {
  MOD_IMPORT_MODE,
  type ModImportMode,
  type ModPresetDto,
  modPresetSchema,
  type ServerModDto,
  type ServerStatus,
} from '@aegis/api-contracts';
import { Button, FileUploader, Notice, TabContent, Tabs, Tag } from '@aegis/ui';
import {
  notifyApiError,
  notifySuccess,
  useModalDialog,
  useUnsavedChangesGuard,
} from '@aegis/web/core';

import { modsQueryKeys } from '../mods.queries';

export interface ImportModsModalProps {
  isOpen: boolean;
  serverId: string;
  installedMods?: ServerModDto[];
  installedWorkshopIds?: Set<string>;
  serverStatus?: ServerStatus;
  isServerLocked?: boolean;
  onClose: () => void;
}

const TAB_ITEMS = [
  { id: 'file', label: 'Upload File' },
  { id: 'json', label: 'Paste JSON' },
];

interface DiffItem {
  workshopId: string;
  name: string;
  targetLabel: string;
  status: 'new' | 'installed' | 'removed';
}

function parseAndValidatePreset(rawText: string): {
  preset: ModPresetDto | null;
  error: string | null;
} {
  if (!rawText.trim()) {
    return { preset: null, error: null };
  }
  try {
    const json = JSON.parse(rawText);
    const parsed = modPresetSchema.safeParse(json);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const path = firstIssue.path.length > 0 ? `${firstIssue.path.join('.')}: ` : '';
      return { preset: null, error: `${path}${firstIssue.message}` };
    }
    const totalCount = parsed.data.steamWsMods.length + parsed.data.steamWsServerMods.length;
    if (totalCount === 0) {
      return {
        preset: null,
        error: 'Preset contains no mods (both steamWsMods and steamWsServerMods are empty).',
      };
    }
    return { preset: parsed.data, error: null };
  } catch (err) {
    return {
      preset: null,
      error: err instanceof Error ? `Invalid JSON syntax: ${err.message}` : 'Invalid JSON syntax',
    };
  }
}

function mapPresetSection(
  items: { workshopId: string; name: string }[],
  targetLabel: string,
  installedIds: Set<string>,
  presetIds: Set<string>,
): { items: DiffItem[]; newCount: number; installedCount: number } {
  const result: DiffItem[] = [];
  let newCount = 0;
  let installedCount = 0;

  for (const item of items) {
    presetIds.add(item.workshopId);
    const isInstalled = installedIds.has(item.workshopId);
    if (isInstalled) {
      installedCount += 1;
    } else {
      newCount += 1;
    }
    result.push({
      workshopId: item.workshopId,
      name: item.name,
      targetLabel,
      status: isInstalled ? 'installed' : 'new',
    });
  }

  return { items: result, newCount, installedCount };
}

function findRemovedMods(installedMods: ServerModDto[], presetIds: Set<string>): DiffItem[] {
  const removed: DiffItem[] = [];
  for (const mod of installedMods) {
    if (mod.sourceType === 'workshop' && mod.workshopId && !presetIds.has(mod.workshopId)) {
      removed.push({
        workshopId: mod.workshopId,
        name: mod.name,
        targetLabel: mod.loadTarget === 'server_only' ? 'Server Only' : 'Client & Server',
        status: 'removed',
      });
    }
  }
  return removed;
}

function computeDiff(
  preset: ModPresetDto | null,
  installedMods: ServerModDto[],
  installedIds: Set<string>,
  mode: ModImportMode,
): {
  diffItems: DiffItem[];
  newCount: number;
  installedCount: number;
  removedCount: number;
} {
  if (!preset) {
    return { diffItems: [], newCount: 0, installedCount: 0, removedCount: 0 };
  }

  const presetIds = new Set<string>();
  const clientSection = mapPresetSection(
    preset.steamWsMods,
    'Client & Server',
    installedIds,
    presetIds,
  );
  const serverSection = mapPresetSection(
    preset.steamWsServerMods,
    'Server Only',
    installedIds,
    presetIds,
  );

  const removedItems =
    mode === MOD_IMPORT_MODE.REPLACE ? findRemovedMods(installedMods, presetIds) : [];

  return {
    diffItems: [...clientSection.items, ...serverSection.items, ...removedItems],
    newCount: clientSection.newCount + serverSection.newCount,
    installedCount: clientSection.installedCount + serverSection.installedCount,
    removedCount: removedItems.length,
  };
}

function StrategySelector({
  strategy,
  disabled,
  onChange,
}: {
  strategy: ModImportMode;
  disabled: boolean;
  onChange: (mode: ModImportMode) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold text-[var(--color-text-main)]">
        Import Strategy
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${
            strategy === MOD_IMPORT_MODE.MERGE
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
          }`}
        >
          <input
            type="radio"
            name="import-strategy"
            value={MOD_IMPORT_MODE.MERGE}
            checked={strategy === MOD_IMPORT_MODE.MERGE}
            disabled={disabled}
            onChange={() => onChange(MOD_IMPORT_MODE.MERGE)}
            className="mt-0.5 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <div className="text-left space-y-0.5">
            <span className="text-xs font-medium text-[var(--color-text-main)] block">
              Merge with existing
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] block">
              Appends new mods, skips duplicates. Preserves existing order.
            </span>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } ${
            strategy === MOD_IMPORT_MODE.REPLACE
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
          }`}
        >
          <input
            type="radio"
            name="import-strategy"
            value={MOD_IMPORT_MODE.REPLACE}
            checked={strategy === MOD_IMPORT_MODE.REPLACE}
            disabled={disabled}
            onChange={() => onChange(MOD_IMPORT_MODE.REPLACE)}
            className="mt-0.5 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <div className="text-left space-y-0.5">
            <span className="text-xs font-medium text-[var(--color-text-main)] block">
              Replace all workshop mods
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)] block">
              Replaces workshop mods in order. Preserves local mods.
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}

function DiffPreview({
  preset,
  diffItems,
  newCount,
  installedCount,
  removedCount,
  strategy,
}: {
  preset: ModPresetDto;
  diffItems: DiffItem[];
  newCount: number;
  installedCount: number;
  removedCount: number;
  strategy: ModImportMode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-text-main)]">Diff Preview</span>
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>{preset.steamWsMods.length} Client & Server</span>
          <span>•</span>
          <span>{preset.steamWsServerMods.length} Server-Only</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <span className="text-[var(--color-text-muted)] block text-[11px]">To Add</span>
          <span className="font-semibold text-[var(--color-status-success)]">{newCount}</span>
        </div>
        <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <span className="text-[var(--color-text-muted)] block text-[11px]">Installed</span>
          <span className="font-semibold text-[var(--color-text-main)]">{installedCount}</span>
        </div>
        <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <span className="text-[var(--color-text-muted)] block text-[11px]">
            {strategy === MOD_IMPORT_MODE.REPLACE ? 'To Remove' : 'Skipped'}
          </span>
          <span
            className={`font-semibold ${strategy === MOD_IMPORT_MODE.REPLACE && removedCount > 0 ? 'text-[var(--color-status-warning)]' : 'text-[var(--color-text-muted)]'}`}
          >
            {strategy === MOD_IMPORT_MODE.REPLACE ? removedCount : installedCount}
          </span>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {diffItems.map(item => (
          <div
            key={`${item.status}-${item.workshopId}`}
            className="flex items-center justify-between p-2.5 text-xs gap-3"
          >
            <div className="flex flex-col min-w-0 text-left">
              <span className="font-medium text-[var(--color-text-main)] truncate">
                {item.name}
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                ID: {item.workshopId} • {item.targetLabel}
              </span>
            </div>

            <div className="shrink-0">
              {item.status === 'new' && <Tag color="success">New</Tag>}
              {item.status === 'installed' && <Tag color="default">Already Installed</Tag>}
              {item.status === 'removed' && <Tag color="warning">Will be removed</Tag>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportModsDialog({
  serverId,
  installedMods = [],
  installedWorkshopIds,
  isServerLocked = false,
  onClose,
}: Omit<ImportModsModalProps, 'isOpen'>) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'file' | 'json'>('file');
  const [strategy, setStrategy] = useState<ModImportMode>(MOD_IMPORT_MODE.MERGE);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');

  const isDirty = Boolean(selectedFile || pastedText.trim());
  const { confirmDiscard, release: releaseGuard } = useUnsavedChangesGuard(isDirty);
  const requestClose = () => confirmDiscard(onClose);
  const { dialogRef, handleBackdropClick } = useModalDialog({ onClose: requestClose });

  const activeRawText = activeTab === 'file' ? fileContent : pastedText;
  const { preset: parsedPreset, error: validationError } = useMemo(
    () => parseAndValidatePreset(activeRawText),
    [activeRawText],
  );

  const resolvedInstalledIds = useMemo(() => {
    if (installedWorkshopIds) return installedWorkshopIds;
    return new Set(
      installedMods
        .filter(m => m.sourceType === 'workshop' && Boolean(m.workshopId))
        .map(m => m.workshopId!),
    );
  }, [installedMods, installedWorkshopIds]);

  const { diffItems, newCount, installedCount, removedCount } = useMemo(
    () => computeDiff(parsedPreset, installedMods, resolvedInstalledIds, strategy),
    [parsedPreset, installedMods, resolvedInstalledIds, strategy],
  );

  const handleFileChange = async (file: File | null) => {
    setSelectedFile(file);
    if (!file) {
      setFileContent('');
      return;
    }
    try {
      const text = await file.text();
      setFileContent(text);
    } catch {
      setFileContent('{}');
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!parsedPreset) {
        throw new Error('No preset loaded');
      }
      return apiClient.mods.importPreset(serverId, {
        preset: parsedPreset,
        mode: strategy,
      });
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifySuccess('MODS_BATCH_ADDED', {
        addedCount: data.added.length,
        skippedCount: data.skippedCount,
      });
      releaseGuard();
      onClose();
    },
    onError: err => {
      notifyApiError(err, 'Failed to Import Mod Preset');
    },
  });

  const canSubmit = Boolean(parsedPreset) && !validationError && !importMutation.isPending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-preset-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 space-y-5 text-left"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="import-preset-title"
                className="text-lg font-semibold text-[var(--color-text-main)]"
              >
                Import Mod Preset
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Import a DayZ launcher JSON preset containing client and server workshop mods.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            isIconOnly
            leftIcon={X}
            aria-label="Close dialog"
            onClick={requestClose}
          />
        </div>

        {isServerLocked && (
          <Notice variant="warning" title="Server is Active — Mod Configuration Locked">
            Mod configuration cannot be modified while the server process is active. Stop the server
            to import presets.
          </Notice>
        )}

        <Tabs
          value={activeTab}
          onChange={val => setActiveTab(val as 'file' | 'json')}
          items={TAB_ITEMS}
          aria-label="Preset intake method"
        >
          <TabContent value="file">
            <div className="pt-2">
              <FileUploader
                accept=".json"
                maxSizeBytes={2 * 1024 * 1024}
                label="Preset File (.json)"
                helperText="Select or drop a DayZ launcher preset JSON file up to 2 MB."
                disabled={isServerLocked}
                value={selectedFile}
                onChange={handleFileChange}
              />
            </div>
          </TabContent>
          <TabContent value="json">
            <div className="pt-2 space-y-1.5">
              <label
                htmlFor="paste-preset-json"
                className="block text-xs font-medium text-[var(--color-text-main)]"
              >
                Preset JSON Content
              </label>
              <textarea
                id="paste-preset-json"
                rows={7}
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder='{\n  "steamWsMods": [\n    { "workshopId": "1559212036", "name": "CF" }\n  ],\n  "steamWsServerMods": []\n}'
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-mono text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isServerLocked}
              />
            </div>
          </TabContent>
        </Tabs>

        {validationError && (
          <p
            role="alert"
            className="text-xs text-[var(--color-status-danger)] flex items-center gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{validationError}</span>
          </p>
        )}

        {parsedPreset && (
          <>
            <StrategySelector
              strategy={strategy}
              disabled={isServerLocked}
              onChange={setStrategy}
            />

            <DiffPreview
              preset={parsedPreset}
              diffItems={diffItems}
              newCount={newCount}
              installedCount={installedCount}
              removedCount={removedCount}
              strategy={strategy}
            />
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" type="button" onClick={requestClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            isLoading={importMutation.isPending}
            disabled={!canSubmit || isServerLocked}
            title={isServerLocked ? 'Cannot import mods while server is active' : undefined}
            onClick={() => importMutation.mutate()}
          >
            Import Preset
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ImportModsModal({
  isOpen,
  serverId,
  installedMods,
  installedWorkshopIds,
  serverStatus,
  isServerLocked,
  onClose,
}: ImportModsModalProps) {
  if (!isOpen) return null;

  return (
    <ImportModsDialog
      serverId={serverId}
      installedMods={installedMods}
      installedWorkshopIds={installedWorkshopIds}
      serverStatus={serverStatus}
      isServerLocked={isServerLocked}
      onClose={onClose}
    />
  );
}
