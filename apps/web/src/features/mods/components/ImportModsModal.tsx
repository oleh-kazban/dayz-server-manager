import { useMemo, useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Upload, X } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import {
  type ImportServerModsResponseDto,
  MOD_IMPORT_MODE,
  type ModImportMode,
  type ModLoadTarget,
  type ModPresetDto,
  modPresetSchema,
  type ServerModDto,
} from '@aegis/api-contracts';
import { Button, Confirmation, FileUploader, Notice, TabContent, Tabs, Tag } from '@aegis/ui';
import {
  extractApiFieldErrors,
  notifyApiError,
  notifySuccess,
  resolveFieldErrors,
  useModalDialog,
  useUnsavedChangesGuard,
} from '@aegis/web/core';

import { getTargetLabel } from '../mods.columns';
import { modsQueryKeys } from '../mods.queries';

export interface ImportModsModalProps {
  isOpen: boolean;
  serverId: string;
  installedMods?: ServerModDto[];
  installedWorkshopIds?: Set<string>;
  isServerLocked?: boolean;
  onClose: () => void;
}

const TAB_ITEMS = [
  { id: 'file', label: 'Upload File' },
  { id: 'json', label: 'Paste JSON' },
];

const FILE_READ_ERROR = 'Could not read the selected file. Try selecting it again.';

interface PresetEntry {
  workshopId: string;
  name: string;
  loadTarget: ModLoadTarget;
}

interface DiffItem {
  workshopId: string;
  name: string;
  targetLabel: string;
  status: 'new' | 'installed' | 'removed';
}

interface PresetDiff {
  diffItems: DiffItem[];
  newCount: number;
  installedCount: number;
  removedCount: number;
  duplicateCount: number;
}

const EMPTY_DIFF: PresetDiff = {
  diffItems: [],
  newCount: 0,
  installedCount: 0,
  removedCount: 0,
  duplicateCount: 0,
};

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

/**
 * Flattens the preset the same way the server does: client mods first, then server-only mods,
 * keeping only the first occurrence of each Workshop ID.
 */
function dedupePresetEntries(preset: ModPresetDto): {
  entries: PresetEntry[];
  duplicateCount: number;
} {
  const seen = new Set<string>();
  const entries: PresetEntry[] = [];
  let duplicateCount = 0;

  const combined: PresetEntry[] = [
    ...preset.steamWsMods.map(item => ({ ...item, loadTarget: 'client_server' as const })),
    ...preset.steamWsServerMods.map(item => ({ ...item, loadTarget: 'server_only' as const })),
  ];
  for (const entry of combined) {
    if (seen.has(entry.workshopId)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(entry.workshopId);
    entries.push(entry);
  }

  return { entries, duplicateCount };
}

function getPresetWorkshopIds(preset: ModPresetDto): Set<string> {
  return new Set(dedupePresetEntries(preset).entries.map(entry => entry.workshopId));
}

function findRemovedMods(installedMods: ServerModDto[], presetIds: Set<string>): DiffItem[] {
  return installedMods
    .filter(
      mod => mod.sourceType === 'workshop' && mod.workshopId && !presetIds.has(mod.workshopId),
    )
    .map(mod => ({
      workshopId: mod.workshopId!,
      name: mod.name,
      targetLabel: getTargetLabel(mod.loadTarget).label,
      status: 'removed' as const,
    }));
}

function computeDiff(
  preset: ModPresetDto | null,
  installedMods: ServerModDto[],
  installedIds: Set<string>,
  mode: ModImportMode,
): PresetDiff {
  if (!preset) {
    return EMPTY_DIFF;
  }

  const { entries, duplicateCount } = dedupePresetEntries(preset);
  const presetItems: DiffItem[] = entries.map(entry => ({
    workshopId: entry.workshopId,
    name: entry.name,
    targetLabel: getTargetLabel(entry.loadTarget).label,
    status: installedIds.has(entry.workshopId) ? 'installed' : 'new',
  }));
  const installedCount = presetItems.filter(item => item.status === 'installed').length;

  const removedItems =
    mode === MOD_IMPORT_MODE.REPLACE
      ? findRemovedMods(installedMods, new Set(entries.map(entry => entry.workshopId)))
      : [];

  return {
    diffItems: [...presetItems, ...removedItems],
    newCount: presetItems.length - installedCount,
    installedCount,
    removedCount: removedItems.length,
    duplicateCount,
  };
}

function notifyImportSuccess(
  data: ImportServerModsResponseDto,
  preset: ModPresetDto,
  mode: ModImportMode,
): void {
  if (mode === MOD_IMPORT_MODE.REPLACE) {
    const presetIds = getPresetWorkshopIds(preset);
    const presetModsOnServer = data.mods.filter(
      mod => mod.workshopId && presetIds.has(mod.workshopId),
    ).length;
    notifySuccess('MODS_PRESET_REPLACED', {
      addedCount: data.added.length,
      keptCount: presetModsOnServer - data.added.length,
      removedCount: data.removedCount,
    });
    return;
  }
  notifySuccess('MODS_BATCH_ADDED', {
    addedCount: data.added.length,
    skippedCount: data.skippedCount,
  });
}

function StrategyOption({
  mode,
  strategy,
  disabled,
  title,
  description,
  onChange,
}: {
  mode: ModImportMode;
  strategy: ModImportMode;
  disabled: boolean;
  title: string;
  description: string;
  onChange: (mode: ModImportMode) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        strategy === mode
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
      }`}
    >
      <input
        type="radio"
        name="import-strategy"
        value={mode}
        checked={strategy === mode}
        disabled={disabled}
        onChange={() => onChange(mode)}
        className="mt-0.5 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
      />
      <div className="text-left space-y-0.5">
        <span className="text-xs font-medium text-[var(--color-text-main)] block">{title}</span>
        <span className="text-[11px] text-[var(--color-text-muted)] block">{description}</span>
      </div>
    </label>
  );
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
        <StrategyOption
          mode={MOD_IMPORT_MODE.MERGE}
          strategy={strategy}
          disabled={disabled}
          title="Merge with existing"
          description="Appends new mods, skips duplicates. Preserves existing order."
          onChange={onChange}
        />
        <StrategyOption
          mode={MOD_IMPORT_MODE.REPLACE}
          strategy={strategy}
          disabled={disabled}
          title="Replace all workshop mods"
          description="Workshop mods follow the preset order; mods not in it are removed. Installed mods keep their settings and local mods keep their position."
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function DiffPreview({
  preset,
  diff,
  strategy,
}: {
  preset: ModPresetDto;
  diff: PresetDiff;
  strategy: ModImportMode;
}) {
  const { diffItems, newCount, installedCount, removedCount, duplicateCount } = diff;
  const isReplace = strategy === MOD_IMPORT_MODE.REPLACE;

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
            {isReplace ? 'To Remove' : 'Skipped'}
          </span>
          <span
            className={`font-semibold ${isReplace && removedCount > 0 ? 'text-[var(--color-status-warning)]' : 'text-[var(--color-text-muted)]'}`}
          >
            {isReplace ? removedCount : installedCount + duplicateCount}
          </span>
        </div>
      </div>

      {duplicateCount > 0 && (
        <p className="text-[11px] text-[var(--color-text-muted)]">
          {duplicateCount} duplicate preset entr{duplicateCount === 1 ? 'y' : 'ies'} will be
          ignored; the first occurrence of each Workshop ID is used.
        </p>
      )}

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

function useInstalledWorkshopIds(
  installedMods: ServerModDto[],
  installedWorkshopIds?: Set<string>,
): Set<string> {
  return useMemo(() => {
    if (installedWorkshopIds) return installedWorkshopIds;
    return new Set(
      installedMods
        .filter(m => m.sourceType === 'workshop' && Boolean(m.workshopId))
        .map(m => m.workshopId!),
    );
  }, [installedMods, installedWorkshopIds]);
}

/** Reads the chosen file; a slower read of an earlier file never overwrites a later one. */
function usePresetFile(onInputChange: () => void) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [fileReadError, setFileReadError] = useState<string | null>(null);
  const latestReadRef = useRef(0);

  const handleFileChange = async (file: File | null) => {
    const readId = ++latestReadRef.current;
    onInputChange();
    setSelectedFile(file);
    setFileContent('');
    setFileReadError(null);
    if (!file) return;

    try {
      const text = await file.text();
      if (readId === latestReadRef.current) setFileContent(text);
    } catch {
      if (readId === latestReadRef.current) setFileReadError(FILE_READ_ERROR);
    }
  };

  return { selectedFile, fileContent, fileReadError, handleFileChange };
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
  const [pastedText, setPastedText] = useState<string>('');
  const [isConfirmingReplace, setIsConfirmingReplace] = useState(false);
  const [apiFieldErrors, setApiFieldErrors] = useState<Record<string, string>>({});

  const clearApiFieldErrors = () => setApiFieldErrors({});
  const { selectedFile, fileContent, fileReadError, handleFileChange } =
    usePresetFile(clearApiFieldErrors);

  const isDirty = Boolean(selectedFile || pastedText.trim());
  const { confirmDiscard, release: releaseGuard } = useUnsavedChangesGuard(isDirty);

  const activeRawText = activeTab === 'file' ? fileContent : pastedText;
  const parsed = useMemo(() => parseAndValidatePreset(activeRawText), [activeRawText]);
  const parsedPreset = activeTab === 'file' && fileReadError ? null : parsed.preset;
  const validationError = activeTab === 'file' && fileReadError ? fileReadError : parsed.error;

  const resolvedInstalledIds = useInstalledWorkshopIds(installedMods, installedWorkshopIds);
  const diff = useMemo(
    () => computeDiff(parsedPreset, installedMods, resolvedInstalledIds, strategy),
    [parsedPreset, installedMods, resolvedInstalledIds, strategy],
  );

  const importMutation = useMutation({
    mutationFn: async ({ preset, mode }: { preset: ModPresetDto; mode: ModImportMode }) =>
      apiClient.mods.importPreset(serverId, { preset, mode }),
    onSuccess: (data, { preset, mode }) => {
      queryClient.invalidateQueries({ queryKey: modsQueryKeys.list(serverId) });
      notifyImportSuccess(data, preset, mode);
      releaseGuard();
      onClose();
    },
    onError: err => {
      setIsConfirmingReplace(false);
      setApiFieldErrors(resolveFieldErrors(extractApiFieldErrors(err)));
      notifyApiError(err, 'Failed to Import Mod Preset');
    },
  });

  const requestClose = () => confirmDiscard(onClose);
  const { dialogRef, handleBackdropClick } = useModalDialog({
    onClose: requestClose,
    isBusy: importMutation.isPending,
  });

  const submitImport = () => {
    if (!parsedPreset) return;
    importMutation.mutate({ preset: parsedPreset, mode: strategy });
  };

  const handleImportClick = () => {
    if (strategy === MOD_IMPORT_MODE.REPLACE && diff.removedCount > 0) {
      setIsConfirmingReplace(true);
      return;
    }
    submitImport();
  };

  const canSubmit = Boolean(parsedPreset) && !importMutation.isPending && !isServerLocked;
  const apiErrorMessages = Object.entries(apiFieldErrors);

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
                aria-invalid={Boolean(validationError) || apiErrorMessages.length > 0}
                onChange={e => {
                  clearApiFieldErrors();
                  setPastedText(e.target.value);
                }}
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

        {apiErrorMessages.length > 0 && (
          <ul role="alert" className="space-y-1 text-xs text-[var(--color-status-danger)]">
            {apiErrorMessages.map(([field, message]) => (
              <li key={field} className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {field}: {message}
                </span>
              </li>
            ))}
          </ul>
        )}

        {parsedPreset && (
          <>
            <StrategySelector
              strategy={strategy}
              disabled={isServerLocked}
              onChange={setStrategy}
            />

            <DiffPreview preset={parsedPreset} diff={diff} strategy={strategy} />
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
            disabled={!canSubmit}
            title={isServerLocked ? 'Cannot import mods while server is active' : undefined}
            onClick={handleImportClick}
          >
            Import Preset
          </Button>
        </div>
      </div>

      {isConfirmingReplace && (
        <Confirmation
          title="Replace Workshop Mods"
          description={`${diff.removedCount} Workshop mod(s) not in the preset will be removed from this server. Mods already installed keep their settings.`}
          variant="danger"
          confirmLabel="Replace Mods"
          cancelLabel="Cancel"
          isLoading={importMutation.isPending}
          onConfirm={submitImport}
          onCancel={() => setIsConfirmingReplace(false)}
        />
      )}
    </div>
  );
}

export function ImportModsModal({
  isOpen,
  serverId,
  installedMods,
  installedWorkshopIds,
  isServerLocked,
  onClose,
}: ImportModsModalProps) {
  if (!isOpen) return null;

  return (
    <ImportModsDialog
      serverId={serverId}
      installedMods={installedMods}
      installedWorkshopIds={installedWorkshopIds}
      isServerLocked={isServerLocked}
      onClose={onClose}
    />
  );
}
