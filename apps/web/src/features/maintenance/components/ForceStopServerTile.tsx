import { type MouseEvent, useId, useState } from 'react';

import { OctagonX } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import type { ServerSummaryDto } from '@aegis/api-contracts';
import { Button, Confirmation } from '@aegis/ui';

import { getForceStopBlocker } from '../maintenance.utils';
import { useServerLifecycleAction } from '../useServerLifecycleAction';

import { LifecycleActionTile } from './LifecycleActionTile';

export interface ForceStopServerTileProps {
  server: ServerSummaryDto;
}

/**
 * Force-stop control (DSM-00170): kills the process tree without the RCON save flush, so it
 * always asks first. Inert (focusable, with the reason) when nothing is running.
 */
export function ForceStopServerTile({ server }: ForceStopServerTileProps) {
  const hintId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const forceStop = useServerLifecycleAction({
    serverId: server.id,
    request: id => apiClient.servers.forceStop(id),
    successCode: 'SERVER_FORCE_STOPPED',
    errorTitle: 'Force-stop Failed',
  });

  const blocker = getForceStopBlocker(server.status);
  const isInert = blocker !== null || forceStop.isPending;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isInert) {
      event.preventDefault();
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    forceStop.run();
  };

  return (
    <>
      <LifecycleActionTile
        title="Force-stop"
        description="Kill the server process immediately, without saving the world. Use it when a normal stop does not work."
        hint={blocker}
        hintId={hintId}
        action={
          <Button
            variant="secondary"
            destructive
            leftIcon={OctagonX}
            isLoading={forceStop.isPending}
            aria-disabled={isInert || undefined}
            aria-describedby={blocker ? hintId : undefined}
            onClick={handleClick}
          >
            Force-stop
          </Button>
        }
      />

      {/* Closes by itself if the server stops on its own while the dialog is open. */}
      {confirmOpen && !blocker && (
        <Confirmation
          title={`Force-stop "${server.name}"?`}
          description="The process is killed without saving. World progress since the last save is lost, and connected players are disconnected immediately."
          variant="danger"
          confirmLabel="Force-stop"
          cancelLabel="Keep running"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
