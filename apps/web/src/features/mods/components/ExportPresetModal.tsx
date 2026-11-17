import { useMemo, useState } from 'react';

import { Download, X } from 'lucide-react';

import type { ModPresetDto, ServerModDto } from '@aegis/api-contracts';
import { Button, Checkbox, Notice, showToast, Tag } from '@aegis/ui';
import { notifyApiError, useModalDialog } from '@aegis/web/core';

import { sanitizePresetFilename } from './ExportPresetModal.utils';

export interface ExportPresetModalProps {
  isOpen: boolean;
  serverName: string;
  serverId: string;
  mods?: ServerModDto[];
  onClose: () => void;
}

function ExportPresetDialog({
  serverName,
  mods = [],
  onClose,
}: Omit<ExportPresetModalProps, 'isOpen'>) {
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const { dialogRef, handleBackdropClick } = useModalDialog({ onClose });

  const workshopMods = useMemo(() => {
    return mods
      .filter(m => m.sourceType === 'workshop' && Boolean(m.workshopId))
      .sort((a, b) => a.loadOrder - b.loadOrder);
  }, [mods]);

  const eligibleMods = useMemo(() => {
    if (includeDisabled) {
      return workshopMods;
    }
    return workshopMods.filter(m => m.enabled);
  }, [workshopMods, includeDisabled]);

  const { clientMods, serverOnlyMods } = useMemo(() => {
    const client: ServerModDto[] = [];
    const serverOnly: ServerModDto[] = [];
    for (const mod of eligibleMods) {
      if (mod.loadTarget === 'server_only') {
        serverOnly.push(mod);
      } else {
        client.push(mod);
      }
    }
    return { clientMods: client, serverOnlyMods: serverOnly };
  }, [eligibleMods]);

  const handleDownload = () => {
    if (eligibleMods.length === 0) return;

    try {
      const presetPayload: ModPresetDto = {
        steamWsMods: clientMods.map(m => ({
          workshopId: m.workshopId!,
          name: m.name,
        })),
        steamWsServerMods: serverOnlyMods.map(m => ({
          workshopId: m.workshopId!,
          name: m.name,
        })),
      };

      const jsonString = JSON.stringify(presetPayload, null, 2);
      const filename = sanitizePresetFilename(serverName);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Delayed revocation avoids destroying the blob while native "Save As" dialog is open
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      // Use transient toast (do not pollute persistent notification bell center)
      showToast.success('Preset Export', `Download started for ${filename}.`);
      onClose();
    } catch (err) {
      notifyApiError(err, 'Failed to Export Mod Preset');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-preset-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 space-y-5 text-left"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="export-preset-title"
                className="text-lg font-semibold text-[var(--color-text-main)]"
              >
                Export Mod Preset
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Generate and download a DayZ launcher JSON preset containing workshop mods.
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

        <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] space-y-2">
          <Checkbox
            id="include-disabled-mods"
            label="Include disabled mods"
            checked={includeDisabled}
            onChange={e => setIncludeDisabled(e.target.checked)}
          />
          <p className="text-[11px] text-[var(--color-text-muted)] pl-6">
            When unchecked, only currently enabled workshop mods will be included in the exported
            preset. Local mods are strictly omitted.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
            <span className="text-[var(--color-text-muted)] block text-[11px]">
              Total to Export
            </span>
            <span className="font-semibold text-[var(--color-text-main)]">
              {eligibleMods.length}
            </span>
          </div>
          <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
            <span className="text-[var(--color-text-muted)] block text-[11px]">
              Client & Server
            </span>
            <span className="font-semibold text-[var(--color-text-main)]">{clientMods.length}</span>
          </div>
          <div className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
            <span className="text-[var(--color-text-muted)] block text-[11px]">Server-Only</span>
            <span className="font-semibold text-[var(--color-text-main)]">
              {serverOnlyMods.length}
            </span>
          </div>
        </div>

        {eligibleMods.length === 0 ? (
          <Notice variant="info" title="No Exportable Mods">
            No enabled workshop mods are available to export. Enable mods or check &quot;Include
            disabled mods&quot; to export.
          </Notice>
        ) : (
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-[var(--color-text-main)]">
              Mods to be Exported ({eligibleMods.length})
            </span>
            <div className="max-h-56 overflow-y-auto divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
              {eligibleMods.map(mod => {
                const isServerOnly = mod.loadTarget === 'server_only';
                return (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between p-2.5 text-xs gap-3"
                  >
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="font-medium text-[var(--color-text-main)] truncate">
                        {mod.name}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        ID: {mod.workshopId} • {isServerOnly ? 'Server Only' : 'Client & Server'}
                        {!mod.enabled && ' • (Disabled)'}
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {!mod.enabled && <Tag color="warning">Disabled</Tag>}
                      <Tag color={isServerOnly ? 'primary' : 'default'}>
                        {isServerOnly ? 'Server-Only' : 'Client & Server'}
                      </Tag>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            leftIcon={Download}
            disabled={eligibleMods.length === 0}
            onClick={handleDownload}
          >
            Download Preset
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExportPresetModal({
  isOpen,
  serverName,
  serverId,
  mods,
  onClose,
}: ExportPresetModalProps) {
  if (!isOpen) return null;

  return (
    <ExportPresetDialog serverName={serverName} serverId={serverId} mods={mods} onClose={onClose} />
  );
}
