import { CheckCircle2, Terminal, X, XCircle } from 'lucide-react';

import type { SteamDiagnosticsResultDto } from '@aegis/api-contracts';
import { Button, StatusTag, Tag } from '@aegis/ui';

export interface SteamDiagnosticsModalProps {
  isOpen: boolean;
  result: SteamDiagnosticsResultDto | null;
  isLoading: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number) {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}

function DiagnosticMetricCard({
  title,
  isValid,
  mainText,
  subText,
}: {
  title: string;
  isValid: boolean;
  mainText: string;
  subText?: string;
}) {
  return (
    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">{title}</span>
        {isValid ? (
          <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
        ) : (
          <XCircle className="w-4 h-4 text-[var(--color-danger)]" />
        )}
      </div>
      <p className="text-sm font-medium text-[var(--color-text-main)]">{mainText}</p>
      {subText && <p className="text-xs text-[var(--color-text-muted)] font-mono">{subText}</p>}
    </div>
  );
}

function StorageMetricCard({
  title,
  isWritable,
  freeBytes,
  description,
}: {
  title: string;
  isWritable: boolean;
  freeBytes: number;
  description: string;
}) {
  return (
    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">{title}</span>
        <Tag variant="subtle" color={isWritable ? 'success' : 'danger'}>
          {isWritable ? 'Writable' : 'Locked'}
        </Tag>
      </div>
      <p className="text-sm font-medium text-[var(--color-text-main)]">
        {formatBytes(freeBytes)} Free
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

function DiagnosticLogsViewer({ logs }: { logs: string[] }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        SteamCMD Execution Log
      </label>
      <div className="h-48 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-black/80 p-3 font-mono text-xs text-zinc-300 space-y-1">
        {logs.length === 0 ? (
          <p className="text-zinc-500 italic">No output logged.</p>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SteamDiagnosticsModal({
  isOpen,
  result,
  isLoading,
  onClose,
}: SteamDiagnosticsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="steam-diag-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="steam-diag-title"
                className="text-base font-semibold text-[var(--color-text-main)]"
              >
                SteamCMD Diagnostics & Connectivity
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Probe results for SteamCMD executable, storage volumes, and Valve CM network
                connectivity
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

        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Running SteamCMD diagnostic probe...
            </p>
          </div>
        )}

        {!isLoading && result && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
              <span className="text-sm font-medium text-[var(--color-text-main)]">
                Overall Probe Status
              </span>
              <StatusTag
                status={result.success ? 'online' : 'danger'}
                label={result.success ? 'Diagnostics Passed' : 'Issues Detected'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DiagnosticMetricCard
                title="SteamCMD Binary"
                isValid={result.steamCmdValid}
                mainText={result.steamCmdValid ? 'Executable Verified' : 'Binary Not Found'}
                subText={result.steamCmdVersion ? `Build: ${result.steamCmdVersion}` : undefined}
              />

              <DiagnosticMetricCard
                title="Valve CM Network"
                isValid={result.connectionSuccess}
                mainText={
                  result.connectionSuccess ? 'Connected to Valve Public' : 'Connection Failed'
                }
                subText={
                  result.latencyMs !== undefined ? `Latency: ${result.latencyMs} ms` : undefined
                }
              />

              <StorageMetricCard
                title="Workshop Storage"
                isWritable={result.workshopPathWritable}
                freeBytes={result.workshopFreeBytes}
                description={
                  result.workshopFreeBytes < 20 * 1024 * 1024 * 1024
                    ? 'Storage capacity low'
                    : 'Healthy space'
                }
              />

              <StorageMetricCard
                title="Metadata Storage"
                isWritable={result.metaPathWritable}
                freeBytes={result.metaFreeBytes}
                description="VDF manifests & session tokens"
              />
            </div>

            <DiagnosticLogsViewer logs={result.logs} />
          </div>
        )}

        {!isLoading && !result && (
          <p className="text-sm text-[var(--color-text-muted)] py-6 text-center">
            No diagnostic data available.
          </p>
        )}

        <div className="flex justify-end pt-3 border-t border-[var(--color-border)]">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
