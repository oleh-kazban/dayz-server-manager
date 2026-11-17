import { type MouseEvent, useId } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import type { ServerSummaryDto } from '@aegis/api-contracts';
import { Button, Tooltip } from '@aegis/ui';
import { serverQueries } from '@aegis/web/core';

import { getStartBlocker } from '../maintenance.utils';
import { useServerLifecycleAction } from '../useServerLifecycleAction';

import { LifecycleActionTile } from './LifecycleActionTile';

/** How often the edit lock / launch readiness is re-read while the page is open. */
const READINESS_REFRESH_MS = 15_000;

export interface StartServerTileProps {
  server: ServerSummaryDto;
}

/**
 * Start control (DSM-00169). When starting is impossible the button stays focusable but inert
 * (`aria-disabled`) and says why, both in a tooltip and as visible text under it.
 */
export function StartServerTile({ server }: StartServerTileProps) {
  const hintId = useId();

  const readiness = useQuery({
    ...serverQueries.launchCommand(server.id),
    refetchInterval: READINESS_REFRESH_MS,
  });

  const start = useServerLifecycleAction({
    serverId: server.id,
    request: apiClient.servers.start,
    successCode: 'SERVER_START_REQUESTED',
    errorTitle: 'Start Failed',
  });

  const blocker = getStartBlocker({
    status: server.status,
    preview: readiness.data,
    previewFailed: readiness.isError,
  });
  const isInert = blocker !== null || start.isPending;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isInert) {
      event.preventDefault();
      return;
    }
    start.run();
  };

  return (
    <LifecycleActionTile
      title="Start server"
      description="Launch the DayZ server with its compiled launch command. It counts as running once it has stayed up for the startup window."
      hint={blocker}
      hintId={hintId}
      action={
        <Tooltip content={blocker} disabled={!blocker}>
          <Button
            variant="primary"
            leftIcon={Play}
            isLoading={start.isPending}
            aria-disabled={isInert || undefined}
            aria-describedby={blocker ? hintId : undefined}
            onClick={handleClick}
          >
            Start server
          </Button>
        </Tooltip>
      }
    />
  );
}
