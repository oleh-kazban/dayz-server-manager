import { type MouseEvent, useId, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Square, Undo2 } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import type {
  ApiErrorParams,
  ServerDetailDto,
  ServerSummaryDto,
  StopServerRequestDto,
} from '@aegis/api-contracts';
import { Button, Notice, Tooltip } from '@aegis/ui';
import { extractApiFieldErrors, resolveFieldErrors, serverQueries } from '@aegis/web/core';

import { formatCountdown, getStopBlocker } from '../maintenance.utils';
import { useNow } from '../useNow';
import { useServerLifecycleAction } from '../useServerLifecycleAction';

import { LifecycleActionTile } from './LifecycleActionTile';
import { StopServerDialog } from './StopServerDialog';

export interface StopServerTileProps {
  server: ServerSummaryDto;
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString();

/**
 * Graceful stop control (DSM-00171): opens the Stop dialog (now or after a delay), shows a
 * scheduled stop with a live countdown and Cancel, and a scheduled stop that failed when due.
 */
export function StopServerTile({ server }: StopServerTileProps) {
  const hintId = useId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pendingStop = useQuery(serverQueries.detail(server.id)).data?.pendingStop ?? null;
  const failure = useQuery(serverQueries.stopFailure(server.id)).data;
  const now = useNow(pendingStop !== null);

  const stop = useServerLifecycleAction<StopServerRequestDto>({
    serverId: server.id,
    request: apiClient.servers.stop,
    successCode: detail => (detail.pendingStop ? 'SERVER_STOP_SCHEDULED' : 'SERVER_STOP_REQUESTED'),
    successParams: (detail: ServerDetailDto): ApiErrorParams =>
      detail.pendingStop ? { time: timeOf(detail.pendingStop.executeAt) } : {},
    errorTitle: 'Stop Failed',
  });
  const cancel = useServerLifecycleAction({
    serverId: server.id,
    request: id => apiClient.servers.cancelStop(id),
    successCode: 'SERVER_STOP_CANCELLED',
    errorTitle: 'Cancel Failed',
  });

  const blocker = getStopBlocker(server.status, pendingStop);
  const isInert = blocker !== null || stop.isPending;
  const clearFailure = () =>
    queryClient.setQueryData(serverQueries.stopFailure(server.id).queryKey, null);

  const handleStopClick = (event: MouseEvent<HTMLButtonElement>) => {
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
    stop.run(request, {
      onSuccess: () => setDialogOpen(false),
      onError: error => setFieldErrors(resolveFieldErrors(extractApiFieldErrors(error))),
    });
  };

  const remainingMs = pendingStop ? Date.parse(pendingStop.executeAt) - now : 0;

  return (
    <>
      <LifecycleActionTile
        title="Stop server"
        description="Save the world and shut the server down through RCON, now or after warning players."
        hint={pendingStop ? null : blocker}
        hintId={hintId}
        action={
          <div className="space-y-3">
            {failure && (
              <Notice variant="error" title="The scheduled stop did not run" onClose={clearFailure}>
                {failure.message} The server is still running; Force-stop is still available.
              </Notice>
            )}
            {pendingStop ? (
              <>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs">
                  <p className="font-semibold text-[var(--color-text-main)]">
                    Stop scheduled for {timeOf(pendingStop.executeAt)}
                  </p>
                  <p className="text-[var(--color-text-secondary)]">
                    {remainingMs > 0 ? `Stops in ${formatCountdown(remainingMs)}` : 'Stopping now…'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  leftIcon={Undo2}
                  isLoading={cancel.isPending}
                  onClick={() => cancel.run()}
                >
                  Cancel scheduled stop
                </Button>
              </>
            ) : (
              <Tooltip content={blocker} disabled={!blocker}>
                <Button
                  variant="secondary"
                  leftIcon={Square}
                  isLoading={stop.isPending}
                  aria-disabled={isInert || undefined}
                  aria-describedby={blocker ? hintId : undefined}
                  onClick={handleStopClick}
                >
                  Stop server
                </Button>
              </Tooltip>
            )}
          </div>
        }
      />

      {/* Closes by itself if the server stops or a stop is scheduled elsewhere. */}
      {dialogOpen && !blocker && (
        <StopServerDialog
          serverName={server.name}
          isPending={stop.isPending}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}
