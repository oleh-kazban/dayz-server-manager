import { AlertTriangle, CircleCheck, CircleX } from 'lucide-react';

import type { ConfigDiagnosticDto } from '@aegis/api-contracts';
import { Tag } from '@aegis/ui';

import { countDiagnostics } from './server-config.utils';

export interface ConfigDiagnosticsListProps {
  diagnostics: readonly ConfigDiagnosticDto[];
  isServerResult: boolean;
  onSelectLine: (line: number) => void;
}

export function ConfigDiagnosticsList({
  diagnostics,
  isServerResult,
  onSelectLine,
}: ConfigDiagnosticsListProps) {
  const { errors, warnings } = countDiagnostics(diagnostics);
  const sourceLabel = isServerResult ? 'Server validation' : 'Live checks';

  if (diagnostics.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-[var(--color-status-success)]">
        <CircleCheck aria-hidden="true" className="w-4 h-4 shrink-0" />
        {sourceLabel}: no problems found.
      </p>
    );
  }

  return (
    <section aria-label="Configuration problems" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--color-text-main)]">{sourceLabel}</span>
        <Tag variant="subtle" color={errors > 0 ? 'danger' : 'default'}>
          {errors} {errors === 1 ? 'error' : 'errors'}
        </Tag>
        <Tag variant="subtle" color={warnings > 0 ? 'warning' : 'default'}>
          {warnings} {warnings === 1 ? 'warning' : 'warnings'}
        </Tag>
      </div>
      <ul className="max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        {diagnostics.map((diagnostic, index) => {
          const isError = diagnostic.severity === 'error';
          const Icon = isError ? CircleX : AlertTriangle;
          return (
            <li key={`${diagnostic.code}-${diagnostic.line}-${diagnostic.column}-${index}`}>
              <button
                type="button"
                onClick={() => onSelectLine(diagnostic.line)}
                className="flex w-full min-h-9 items-start gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] cursor-pointer"
              >
                <Icon
                  aria-hidden="true"
                  className={`mt-0.5 w-3.5 h-3.5 shrink-0 ${
                    isError
                      ? 'text-[var(--color-status-danger)]'
                      : 'text-[var(--color-status-warning)]'
                  }`}
                />
                <span className="font-mono text-[var(--color-text-muted)] shrink-0">
                  Ln {diagnostic.line}, Col {diagnostic.column}
                </span>
                <span className="text-[var(--color-text-main)]">
                  <span className="sr-only">{isError ? 'Error: ' : 'Warning: '}</span>
                  {diagnostic.message}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
