import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { Check, FilePlus2, History, ListChecks, Pencil, Save } from 'lucide-react';

import type { ConfigRevisionSummaryDto } from '@aegis/api-contracts';
import { analyzeServerConfig } from '@aegis/dayz-config';
import { Button, Card, Confirmation, Notice, Skeleton, useDebounce } from '@aegis/ui';
import type { CodeEditorHandle } from '@aegis/ui/code-editor';

import { ConfigDiagnosticsList } from './ConfigDiagnosticsList';
import { ConfigLockBanner } from './ConfigLockBanner';
import { ConfigRevisionsPanel } from './ConfigRevisionsPanel';
import type { ConfigEditorMode, ConfigEditSession } from './server-config.types';
import {
  countDiagnostics,
  deriveEditorMode,
  formatConfigTimestamp,
  isSessionDirty,
  LIVE_DIAGNOSTICS_DEBOUNCE_MS,
  revisionSourceLabel,
} from './server-config.utils';
import { type ConfigPendingAction, useConfigEditSession } from './useConfigEditSession';

const CodeEditor = lazy(() => import('./code-editor.lazy'));

type ConfigCardDialog =
  | { kind: 'none' }
  | { kind: 'takeover'; holderName: string }
  | { kind: 'discard' }
  | { kind: 'restore'; revision: ConfigRevisionSummaryDto };

export interface ServerConfigCardProps {
  serverId: string;
  serverName: string;
  isServerRunning: boolean;
}

interface ConfigCardActionsProps {
  mode: ConfigEditorMode;
  session: ConfigEditSession;
  pendingAction: ConfigPendingAction;
  isDirty: boolean;
  hasBlockingErrors: boolean;
  showHistory: boolean;
  onToggleHistory: () => void;
  onEdit: () => void;
  onCreateFromTemplate: () => void;
  onValidate: () => void;
  onSave: () => void;
  onDone: () => void;
}

function ConfigCardActions({
  mode,
  session,
  pendingAction,
  isDirty,
  hasBlockingErrors,
  showHistory,
  onToggleHistory,
  onEdit,
  onCreateFromTemplate,
  onValidate,
  onSave,
  onDone,
}: ConfigCardActionsProps) {
  const isBusy = pendingAction !== null || session.status === 'acquiring';

  if (mode.kind === 'missing') {
    return (
      <Button
        type="button"
        variant="primary"
        leftIcon={FilePlus2}
        disabled={mode.serverRunning || isBusy}
        isLoading={pendingAction === 'template'}
        onClick={onCreateFromTemplate}
      >
        Create from template
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        leftIcon={History}
        aria-expanded={showHistory}
        onClick={onToggleHistory}
      >
        History
      </Button>
      {mode.kind === 'editing' ? (
        <>
          <Button
            type="button"
            variant="secondary"
            leftIcon={ListChecks}
            disabled={isBusy}
            isLoading={pendingAction === 'validate'}
            onClick={onValidate}
          >
            Validate
          </Button>
          <Button
            type="button"
            variant="primary"
            leftIcon={Save}
            disabled={!isDirty || hasBlockingErrors || isBusy}
            isLoading={pendingAction === 'save'}
            onClick={onSave}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            leftIcon={Check}
            disabled={isBusy}
            onClick={onDone}
          >
            {isDirty ? 'Cancel' : 'Done'}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="primary"
          leftIcon={Pencil}
          disabled={mode.kind !== 'viewing' || isBusy}
          isLoading={session.status === 'acquiring'}
          onClick={onEdit}
        >
          Edit
        </Button>
      )}
    </div>
  );
}

function resolveDisplayedText(session: ConfigEditSession, fileContent: string | null): string {
  if (session.status === 'editing') {
    return session.draft;
  }
  if (session.status === 'lost' && session.draft !== null) {
    return session.draft;
  }
  return fileContent ?? '';
}

export function ServerConfigCard({ serverId, serverName, isServerRunning }: ServerConfigCardProps) {
  const edit = useConfigEditSession({ serverId, serverName });
  const editorRef = useRef<CodeEditorHandle>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [dialog, setDialog] = useState<ConfigCardDialog>({ kind: 'none' });

  const { configQuery, session, serverValidation, pendingAction, conflictStep } = edit;
  const config = configQuery.data;
  const displayedText = resolveDisplayedText(session, config?.content ?? null);
  const debouncedText = useDebounce(displayedText, LIVE_DIAGNOSTICS_DEBOUNCE_MS);
  const liveDiagnostics = useMemo(
    () => analyzeServerConfig(debouncedText).diagnostics,
    [debouncedText],
  );
  const mode = config ? deriveEditorMode(config, session, isServerRunning) : null;
  const isEditing = mode?.kind === 'editing';
  const wasEditingRef = useRef(false);

  useEffect(() => {
    if (isEditing && !wasEditingRef.current) {
      editorRef.current?.focus();
    }
    wasEditingRef.current = Boolean(isEditing);
  }, [isEditing]);

  const isServerResult = serverValidation?.content === displayedText;
  const diagnostics =
    serverValidation && isServerResult ? serverValidation.diagnostics : liveDiagnostics;
  const isDiagnosticsCurrent = isServerResult || debouncedText === displayedText;
  const hasBlockingErrors = isDiagnosticsCurrent && countDiagnostics(diagnostics).errors > 0;
  const isDirty = isSessionDirty(session);

  if (configQuery.isLoading) {
    return (
      <Card title="serverDZ.cfg" subtitle="Raw DayZ server configuration">
        <Skeleton variant="rounded" height={448} />
      </Card>
    );
  }

  if (!config || !mode) {
    return (
      <Card title="serverDZ.cfg" subtitle="Raw DayZ server configuration">
        <Notice
          variant="error"
          title="Unable to load serverDZ.cfg"
          action={
            <Button type="button" variant="secondary" onClick={() => void configQuery.refetch()}>
              Retry
            </Button>
          }
        >
          {configQuery.error?.message ?? 'The configuration file could not be read.'}
        </Notice>
      </Card>
    );
  }

  const currentHolderName = config.lock && !config.lock.heldByYou ? config.lock.holderName : null;
  const latestRevision = config.latestRevision;

  const handleDone = () => {
    if (isDirty) {
      setDialog({ kind: 'discard' });
      return;
    }
    edit.finishEditing();
  };

  const closeDialog = () => setDialog({ kind: 'none' });

  return (
    <Card
      title="serverDZ.cfg"
      subtitle="Raw DayZ server configuration. The file on disk is the source of truth."
      actions={
        <ConfigCardActions
          mode={mode}
          session={session}
          pendingAction={pendingAction}
          isDirty={isDirty}
          hasBlockingErrors={hasBlockingErrors}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory(prev => !prev)}
          onEdit={() => void edit.beginEditing()}
          onCreateFromTemplate={() => void edit.createFromTemplate()}
          onValidate={() => void edit.validate(displayedText)}
          onSave={() => void edit.save()}
          onDone={handleDone}
        />
      }
    >
      <div className="p-1 sm:p-2 space-y-4">
        <ConfigLockBanner
          mode={mode}
          currentHolderName={currentHolderName}
          isBusy={pendingAction !== null || session.status === 'acquiring'}
          onTakeOver={() => setDialog({ kind: 'takeover', holderName: currentHolderName ?? '' })}
          onDismissLockLost={edit.dismissLockLost}
        />

        {conflictStep !== 'none' && (
          <Notice
            variant="warning"
            title="serverDZ.cfg changed on disk"
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pendingAction !== null}
                  isLoading={pendingAction === 'reload'}
                  onClick={() => void edit.reload()}
                >
                  Reload
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  destructive
                  disabled={pendingAction !== null}
                  onClick={() => edit.setConflictStep('confirm-overwrite')}
                >
                  Overwrite
                </Button>
              </div>
            }
          >
            The file was modified after you started editing. Reload discards your changes; Overwrite
            replaces the file with your text.
          </Notice>
        )}

        {latestRevision && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Last change: {revisionSourceLabel(latestRevision.source)}
            {latestRevision.authorName ? ` by ${latestRevision.authorName}` : ''} ·{' '}
            <time dateTime={latestRevision.createdAt}>
              {formatConfigTimestamp(latestRevision.createdAt)}
            </time>
          </p>
        )}

        {config.exists && (
          <>
            <Suspense fallback={<Skeleton variant="rounded" height={448} />}>
              <CodeEditor
                ref={editorRef}
                value={displayedText}
                onChange={edit.setDraft}
                language="bohemia-cfg"
                diagnostics={diagnostics}
                readOnly={!isEditing || pendingAction !== null}
                containerClassName="h-[28rem]"
                ariaLabel="serverDZ.cfg contents"
              />
            </Suspense>

            <ConfigDiagnosticsList
              diagnostics={diagnostics}
              isServerResult={isServerResult}
              onSelectLine={line => editorRef.current?.revealLine(line)}
            />
          </>
        )}

        {showHistory && (
          <ConfigRevisionsPanel
            serverId={serverId}
            currentContent={displayedText}
            canRestore={isEditing}
            isRestoring={pendingAction === 'restore'}
            onRequestRestore={revision => setDialog({ kind: 'restore', revision })}
          />
        )}
      </div>

      {dialog.kind === 'takeover' && (
        <Confirmation
          variant="warning"
          title="Take over editing?"
          description={`${dialog.holderName} loses the edit lock and any unsaved changes in their editor.`}
          confirmLabel="Take over"
          onCancel={closeDialog}
          onConfirm={() => {
            closeDialog();
            void edit.takeOver();
          }}
        />
      )}

      {dialog.kind === 'discard' && (
        <Confirmation
          variant="danger"
          title="Discard unsaved changes?"
          description="Your edits to serverDZ.cfg will be lost and the edit lock released."
          confirmLabel="Discard"
          onCancel={closeDialog}
          onConfirm={() => {
            closeDialog();
            edit.finishEditing();
          }}
        />
      )}

      {dialog.kind === 'restore' && (
        <Confirmation
          variant="warning"
          title="Restore this revision?"
          description={`serverDZ.cfg is replaced with the revision from ${formatConfigTimestamp(dialog.revision.createdAt)}. Unsaved changes in the editor are discarded.`}
          confirmLabel="Restore"
          onCancel={closeDialog}
          onConfirm={() => {
            const revisionId = dialog.revision.id;
            closeDialog();
            void edit.restore(revisionId);
          }}
        />
      )}

      {conflictStep === 'confirm-overwrite' && (
        <Confirmation
          variant="danger"
          title="Overwrite changes on disk?"
          description="The changes made outside this editor are replaced with your text. A backup of the current file is kept."
          confirmLabel="Overwrite"
          onCancel={() => edit.setConflictStep('prompt')}
          onConfirm={() => void edit.overwrite()}
        />
      )}
    </Card>
  );
}
