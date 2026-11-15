import { lazy, Suspense, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Columns2, History, RotateCcw, Rows2 } from 'lucide-react';

import type { ConfigRevisionSummaryDto } from '@aegis/api-contracts';
import { Button, Notice, Skeleton, Tag } from '@aegis/ui';
import type { CodeDiffViewLayout } from '@aegis/ui/code-editor';

import { serverConfigQueries } from './server-config.queries';
import { formatConfigTimestamp, revisionSourceLabel } from './server-config.utils';

const CodeDiffView = lazy(() =>
  import('./code-editor.lazy').then(module => ({ default: module.CodeDiffView })),
);

export interface ConfigRevisionsPanelProps {
  serverId: string;
  currentContent: string;
  canRestore: boolean;
  isRestoring: boolean;
  onRequestRestore: (revision: ConfigRevisionSummaryDto) => void;
}

export function ConfigRevisionsPanel({
  serverId,
  currentContent,
  canRestore,
  isRestoring,
  onRequestRestore,
}: ConfigRevisionsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layout, setLayout] = useState<CodeDiffViewLayout>('unified');
  const revisionsQuery = useQuery(serverConfigQueries.revisions(serverId));
  const revisionQuery = useQuery({
    ...serverConfigQueries.revision(serverId, selectedId ?? ''),
    enabled: selectedId !== null,
  });

  const revisions = revisionsQuery.data ?? [];
  const selected = revisions.find(revision => revision.id === selectedId) ?? null;

  if (revisionsQuery.isLoading) {
    return <Skeleton variant="rounded" height={96} />;
  }

  if (revisionsQuery.error) {
    return (
      <Notice variant="error" title="Revision history unavailable">
        {revisionsQuery.error.message}
      </Notice>
    );
  }

  if (revisions.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <History aria-hidden="true" className="w-4 h-4 shrink-0" />
        No revisions recorded yet.
      </p>
    );
  }

  return (
    <section aria-label="Revision history" className="space-y-3">
      <ul className="max-h-64 overflow-y-auto rounded-lg border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        {revisions.map(revision => {
          const isSelected = revision.id === selectedId;
          return (
            <li key={revision.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(isSelected ? null : revision.id)}
                className={`flex w-full min-h-9 flex-wrap items-center justify-between gap-2 px-3 py-2 text-left text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)] ${
                  isSelected
                    ? 'bg-[var(--color-primary-light)]'
                    : 'hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Tag
                    variant="subtle"
                    color={revision.source === 'external' ? 'warning' : 'default'}
                  >
                    {revisionSourceLabel(revision.source)}
                  </Tag>
                  <span className="text-[var(--color-text-main)]">
                    {revision.authorName ?? 'Unknown author'}
                  </span>
                </span>
                <time dateTime={revision.createdAt} className="text-[var(--color-text-muted)]">
                  {formatConfigTimestamp(revision.createdAt)}
                </time>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              Revision from {formatConfigTimestamp(selected.createdAt)} compared with the current
              text
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                leftIcon={layout === 'unified' ? Columns2 : Rows2}
                onClick={() => setLayout(layout === 'unified' ? 'side-by-side' : 'unified')}
              >
                {layout === 'unified' ? 'Side by side' : 'Unified'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                leftIcon={RotateCcw}
                disabled={!canRestore || isRestoring}
                isLoading={isRestoring}
                onClick={() => onRequestRestore(selected)}
              >
                Restore
              </Button>
            </div>
          </div>
          {!canRestore && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Click Edit to restore a revision.
            </p>
          )}
          {revisionQuery.error && (
            <Notice variant="error" title="Revision unavailable">
              {revisionQuery.error.message}
            </Notice>
          )}
          {revisionQuery.data ? (
            <Suspense fallback={<Skeleton variant="rounded" height={320} />}>
              <CodeDiffView
                original={revisionQuery.data.content}
                modified={currentContent}
                language="bohemia-cfg"
                layout={layout}
                containerClassName="h-[20rem]"
                ariaLabel="Differences between the selected revision and the current text"
              />
            </Suspense>
          ) : (
            !revisionQuery.error && <Skeleton variant="rounded" height={320} />
          )}
        </div>
      )}
    </section>
  );
}
