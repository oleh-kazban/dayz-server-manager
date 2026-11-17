import { useRef } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ServerDetailDto, ServerSummaryDto } from '@aegis/api-contracts';
import {
  type NotificationCode,
  notifyApiError,
  notifySuccess,
  serverQueryKeys,
} from '@aegis/web/core';

export interface ServerLifecycleActionOptions {
  serverId: string;
  /** The lifecycle endpoint; it resolves with the server after the transition. */
  request: (serverId: string) => Promise<ServerDetailDto>;
  /** Green toast on success; receives the server `name`. */
  successCode: NotificationCode;
  /** Red toast title when the API error has no known code. */
  errorTitle: string;
}

export interface ServerLifecycleAction {
  /** Sends the request; ignored while one is already in flight (double click). */
  run: () => void;
  isPending: boolean;
}

/**
 * One lifecycle request (start, force-stop, …) with the feedback contract: the returned server
 * goes straight into the cache, then a green toast, or a red toast on any API error. SSE keeps
 * the status live afterwards (DSM-00173).
 */
export function useServerLifecycleAction({
  serverId,
  request,
  successCode,
  errorTitle,
}: ServerLifecycleActionOptions): ServerLifecycleAction {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);

  const mutation = useMutation({
    mutationFn: () => request(serverId),
    onSuccess: (detail: ServerDetailDto) => {
      queryClient.setQueryData(serverQueryKeys.detail(detail.id), detail);
      queryClient.setQueryData<ServerSummaryDto[]>(serverQueryKeys.list(), servers =>
        servers?.map(item =>
          item.id === detail.id
            ? { ...item, status: detail.status, lastExit: detail.lastExit }
            : item,
        ),
      );
      notifySuccess(successCode, { name: detail.name });
    },
    onError: (error: Error) => {
      notifyApiError(error, errorTitle);
    },
    onSettled: () => {
      inFlightRef.current = false;
      void queryClient.invalidateQueries({ queryKey: serverQueryKeys.launchCommand(serverId) });
    },
  });

  const run = () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    mutation.mutate();
  };

  return { run, isPending: mutation.isPending };
}
