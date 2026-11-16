import { type MouseEvent, useId, useRef } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react';

import { apiClient } from '@aegis/api-client';
import type { ServerDetailDto, ServerSummaryDto } from '@aegis/api-contracts';
import { Button, Tooltip } from '@aegis/ui';
import { notifyApiError, notifySuccess, serverQueries, serverQueryKeys } from '@aegis/web/core';

import { getStartBlocker } from '../maintenance.utils';

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
  const queryClient = useQueryClient();
  const hintId = useId();
  const inFlightRef = useRef(false);

  const readiness = useQuery({
    ...serverQueries.launchCommand(server.id),
    refetchInterval: READINESS_REFRESH_MS,
  });

  const startMutation = useMutation({
    mutationFn: (serverId: string) => apiClient.servers.start(serverId),
    onSuccess: (detail: ServerDetailDto) => {
      queryClient.setQueryData(serverQueryKeys.detail(detail.id), detail);
      queryClient.setQueryData<ServerSummaryDto[]>(serverQueryKeys.list(), servers =>
        servers?.map(item => (item.id === detail.id ? { ...item, status: detail.status } : item)),
      );
      notifySuccess('SERVER_START_REQUESTED', { name: detail.name });
    },
    onError: (error: Error) => {
      notifyApiError(error, 'Start Failed');
    },
    onSettled: () => {
      inFlightRef.current = false;
      void queryClient.invalidateQueries({ queryKey: serverQueryKeys.launchCommand(server.id) });
    },
  });

  const blocker = getStartBlocker({
    status: server.status,
    preview: readiness.data,
    previewFailed: readiness.isError,
  });
  const isInert = blocker !== null || startMutation.isPending;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isInert || inFlightRef.current) {
      event.preventDefault();
      return;
    }
    inFlightRef.current = true;
    startMutation.mutate(server.id);
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
            isLoading={startMutation.isPending}
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
