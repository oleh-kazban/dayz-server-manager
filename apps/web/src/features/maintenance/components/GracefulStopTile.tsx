import { type MouseEvent, useId, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Undo2 } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import type {
  ApiErrorParams,
  ServerDetailDto,
  ServerSummaryDto,
  StopServerRequestDto,
} from '@aegis/api-contracts';
import { Button, Notice } from '@aegis/ui';
import {
  extractApiFieldErrors,
  resolveFieldErrors,
  serverQueries,
  serverQueryKeys,
  type ServerRestartFailure,
  type ServerStopFailure,
} from '@aegis/web/core';

import { GRACEFUL_STOP_COPY, type GracefulStopKind } from '../graceful-stop.copy';
import { formatCountdown, getGracefulStopBlocker, ownsPendingStop } from '../maintenance.utils';
import { useNow } from '../useNow';
import { useServerLifecycleAction } from '../useServerLifecycleAction';

import { LifecycleActionTile } from './LifecycleActionTile';
import { StopServerDialog } from './StopServerDialog';

export interface GracefulStopTileProps {
  kind: GracefulStopKind;
  server: ServerSummaryDto;
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString();

/** Title and text of the inline notice for a stop or restart that failed in the background. */
function describeFailure(
  failure: ServerStopFailure | ServerRestartFailure,
  kind: GracefulStopKind,
) {
  if (kind === 'restart' && 'phase' in failure && failure.phase === 'start') {
    return {
      title: 'The server stopped but did not start again',
      body: `${failure.message} Check the launch settings, then start it from the Start tile.`,
    };
  }
  return {
    title:
      kind === 'restart' ? 'The scheduled restart did not run' : 'The scheduled stop did not run',
    body: `${failure.message} The server is still running; Force-stop is still available.`,
  };
}

/**
 * Graceful stop or restart control (DSM-00171/00172): opens the dialog (now or after a delay),
 * shows its own scheduled stop/restart with a live countdown and Cancel, and a stop/restart that
 * failed in the background (SSE) as an inline notice.
 */
export function GracefulStopTile({ kind, server }: GracefulStopTileProps) {
  const copy = GRACEFUL_STOP_COPY[kind];
  const hintId = useId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const detail = useQuery(serverQueries.detail(server.id)).data;
  const pendingStop = detail?.pendingStop ?? null;
  const restartRequested = detail?.restartRequested ?? false;
  const ownPending = pendingStop && ownsPendingStop(kind, restartRequested) ? pendingStop : null;

  const stopFailure = useQuery(serverQueries.stopFailure(server.id)).data;
  const restartFailure = useQuery(serverQueries.restartFailure(server.id)).data;
  const failure = kind === 'restart' ? restartFailure : stopFailure;
  const failureKey =
    kind === 'restart'
      ? serverQueryKeys.restartFailure(server.id)
      : serverQueryKeys.stopFailure(server.id);
  const now = useNow(ownPending !== null);

  const action = useServerLifecycleAction<StopServerRequestDto>({
    serverId: server.id,
    request: copy.request,
    successCode: result => (result.pendingStop ? copy.scheduled : copy.requested),
    successParams: (result: ServerDetailDto): ApiErrorParams =>
      result.pendingStop ? { time: timeOf(result.pendingStop.executeAt) } : {},
    errorTitle: copy.errorTitle,
  });
  const cancel = useServerLifecycleAction({
    serverId: server.id,
    request: id => apiClient.servers.cancelStop(id),
    successCode: copy.cancelled,
    errorTitle: 'Cancel Failed',
  });

  const blocker = getGracefulStopBlocker({
    kind,
    status: server.status,
    pendingStop,
    restartRequested,
  });
  const isInert = blocker !== null || action.isPending;
  const clearFailure = () => queryClient.setQueryData(failureKey, null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isInert) {
      event.preventDefault();
      return;
    }
    setFieldErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = (request: StopServerRequestDto) => {
    clearFailure();
    setFieldErrors({});
    action.run(request, {
      onSuccess: () => setDialogOpen(false),
      onError: error => setFieldErrors(resolveFieldErrors(extractApiFieldErrors(error))),
    });
  };

  const remainingMs = ownPending ? Date.parse(ownPending.executeAt) - now : 0;
  const notice = failure ? describeFailure(failure, kind) : null;

  return (
    <>
      <LifecycleActionTile
        title={copy.title}
        description={copy.description}
        hint={ownPending ? null : blocker}
        hintId={hintId}
        action={
          <div className="space-y-3">
            {notice && (
              <Notice variant="error" title={notice.title} onClose={clearFailure}>
                {notice.body}
              </Notice>
            )}
            {ownPending ? (
              <>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2 text-xs">
                  <p className="font-semibold text-[var(--color-text-main)]">
                    {copy.scheduledFor} {timeOf(ownPending.executeAt)}
                  </p>
                  <p className="text-[var(--color-text-secondary)]">
                    {remainingMs > 0
                      ? `${copy.countdown} ${formatCountdown(remainingMs)}`
                      : copy.due}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  leftIcon={Undo2}
                  isLoading={cancel.isPending}
                  onClick={() => cancel.run()}
                >
                  {copy.cancel}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                leftIcon={copy.icon}
                isLoading={action.isPending}
                aria-disabled={isInert || undefined}
                aria-describedby={blocker ? hintId : undefined}
                onClick={handleClick}
              >
                {copy.button}
              </Button>
            )}
          </div>
        }
      />

      {/* Closes by itself if the server stops or a stop/restart is scheduled elsewhere. */}
      {dialogOpen && !blocker && (
        <StopServerDialog
          kind={kind}
          serverName={server.name}
          isPending={action.isPending}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
