import { useEffect, useRef, useState } from 'react';

import { Check, Copy } from 'lucide-react';

import type { LaunchArgSource, LaunchCommandDto } from '@aegis/api-contracts';
import { Button, Notice, Tag } from '@aegis/ui';

export interface CompiledCommandPanelProps {
  command: LaunchCommandDto;
  /** True while the form differs from the saved server; the preview then shows unsaved values. */
  isUnsaved: boolean;
}

const SOURCE_LABEL: Record<LaunchArgSource, string> = {
  managed: 'DSM',
  mods: 'Mods',
  operator: 'Options',
};

const SOURCE_COLOR: Record<LaunchArgSource, 'default' | 'info' | 'primary'> = {
  managed: 'default',
  mods: 'info',
  operator: 'primary',
};

const COPIED_RESET_MS = 1800;

export function CompiledCommandPanel({ command, isUnsaved }: CompiledCommandPanelProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(command.commandLine);
    setCopied(true);
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  const errors = command.issues.filter(issue => issue.severity === 'error');
  const warnings = command.issues.filter(issue => issue.severity === 'warning');

  return (
    <section aria-label="Compiled launch command" className="space-y-3">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
            Compiled command
          </span>
          {isUnsaved && (
            <Tag variant="subtle" color="warning">
              Unsaved
            </Tag>
          )}
        </div>
        {command.ready && (
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

      {command.ready ? (
        <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-3">
          <p className="break-all font-mono text-xs text-[var(--color-text-main)]">
            {command.executable}
          </p>
          <ul aria-label="Arguments" className="space-y-1.5">
            {command.segments.map(segment => (
              <li key={segment.arg} className="flex min-w-0 items-center gap-2">
                <Tag variant="subtle" color={SOURCE_COLOR[segment.source]}>
                  {SOURCE_LABEL[segment.source]}
                </Tag>
                <code className="min-w-0 break-all font-mono text-xs text-[var(--color-text-main)]">
                  {segment.arg}
                </code>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--color-text-muted)]">
            Working directory: <span className="break-all font-mono">{command.cwd}</span>
          </p>
        </div>
      ) : (
        <Notice variant="error" title="The server cannot be launched with these settings">
          <ul className="list-disc space-y-1 pl-4">
            {errors.map(issue => (
              <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </Notice>
      )}

      {warnings.length > 0 && (
        <Notice variant="warning" title="Review before launching">
          <ul className="list-disc space-y-1 pl-4">
            {warnings.map(issue => (
              <li key={issue.code}>{issue.message}</li>
            ))}
          </ul>
        </Notice>
      )}
    </section>
  );
}
