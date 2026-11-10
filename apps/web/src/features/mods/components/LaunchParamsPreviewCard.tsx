import { useState } from 'react';

import { Check, Copy, Terminal } from 'lucide-react';

import type { LaunchParamsPreviewDto } from '@aegis/api-contracts';
import { Button, Card, Notice } from '@aegis/ui';

export interface LaunchParamsPreviewCardProps {
  launchPreview: LaunchParamsPreviewDto;
}

function CopyableFlagRow({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value: string;
  emptyLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{label}</span>
        {value && (
          <Button
            variant="ghost"
            leftIcon={copied ? Check : Copy}
            onClick={() => {
              void handleCopy();
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
      </div>
      <pre className="w-full overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-2.5 font-mono text-xs text-[var(--color-text-main)]">
        {value || emptyLabel}
      </pre>
    </div>
  );
}

export function LaunchParamsPreviewCard({ launchPreview }: LaunchParamsPreviewCardProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const combinedText = launchPreview.combinedArgs.join(' ');

  const handleCopyCombined = async () => {
    if (!combinedText) return;
    await navigator.clipboard?.writeText(combinedText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  };

  return (
    <Card
      title="Launch Parameter Preview"
      subtitle="Read-only DayZ CLI flags compiled from enabled mods in ascending load order"
      actions={
        combinedText ? (
          <Button
            variant="secondary"
            leftIcon={copiedAll ? Check : Terminal}
            onClick={() => {
              void handleCopyCombined();
            }}
          >
            {copiedAll ? 'Copied All Flags' : 'Copy Combined Flags'}
          </Button>
        ) : undefined
      }
    >
      <div className="p-6 space-y-4">
        {launchPreview.missingFolderCount > 0 && (
          <Notice variant="warning" title="Mods Missing @Folder Name">
            {launchPreview.missingFolderCount} enabled mod(s) do not have a configured{' '}
            <code className="font-mono">@folderName</code> and are excluded from the compiled launch
            flags. Edit each mod to assign its <code className="font-mono">@folderName</code>.
          </Notice>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CopyableFlagRow
            label="Client & Server Mods (-mod=)"
            value={launchPreview.modFlag}
            emptyLabel="No enabled client/server mods with a @folderName"
          />
          <CopyableFlagRow
            label="Server-Only Mods (-serverMod=)"
            value={launchPreview.serverModFlag}
            emptyLabel="No enabled server-only mods with a @folderName"
          />
        </div>
      </div>
    </Card>
  );
}
