import { useRef } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiErrorParams, ServerDetailDto, ServerSummaryDto } from '@aegis/api-contracts';
import {
  type NotificationCode,
  notifyApiError,
  notifySuccess,
  serverQueryKeys,
} from '@aegis/web/core';

export interface ServerLifecycleActionOptions<TVariables> {
  serverId: string;
  /** The lifecycle endpoint; it resolves with the server after the transition. */
  request: (serverId: string, variables: TVariables) => Promise<ServerDetailDto>;
  /** Green toast on success, optionally chosen from the result; receives the server `name`. */
  successCode: NotificationCode | ((detail: ServerDetailDto) => NotificationCode);
  /** Extra toast parameters next to `name` (e.g. the time of a scheduled stop). */
  successParams?: (detail: ServerDetailDto) => ApiErrorParams;
  /** Red toast title when the API error has no known code. */
  errorTitle: string;
}

export interface ServerLifecycleRunCallbacks {
  onSuccess?: (detail: ServerDetailDto) => void;
  onError?: (error: Error) => void;
}

export interface ServerLifecycleAction<TVariables> {
  /** Sends the request; ignored while one is already in flight (double click). */
  run: (variables: TVariables, callbacks?: ServerLifecycleRunCallbacks) => void;
  isPending: boolean;
}

/**
 * One lifecycle request (start, stop, force-stop, …) with the feedback contract: the returned
 * server goes straight into the cache, then a green toast, or a red toast on any API error. SSE
 * keeps the status live afterwards (DSM-00173).
 */
export function useServerLifecycleAction<TVariables = void>({
  serverId,
  request,
  successCode,
  successParams,
  errorTitle,
}: ServerLifecycleActionOptions<TVariables>): ServerLifecycleAction<TVariables> {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (variables: TVariables) => request(serverId, variables),
    onSuccess: (detail: ServerDetailDto) => {
      queryClient.setQueryData(serverQueryKeys.detail(detail.id), detail);
      queryClient.setQueryData<ServerSummaryDto[]>(serverQueryKeys.list(), servers =>
        servers?.map(item =>
          item.id === detail.id
            ? { ...item, status: detail.status, lastExit: detail.lastExit }
            : item,
        ),
      );
      const code = typeof successCode === 'function' ? successCode(detail) : successCode;
      notifySuccess(code, { ...successParams?.(detail), name: detail.name });
    },
    onError: (error: Error) => {
      notifyApiError(error, errorTitle);
    },
    onSettled: () => {
      inFlightRef.current = false;
      void queryClient.invalidateQueries({ queryKey: serverQueryKeys.launchCommand(serverId) });
    },
  });

  const run = (variables: TVariables, callbacks?: ServerLifecycleRunCallbacks) => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    mutation.mutate(variables, callbacks);
  };

  return { run, isPending: mutation.isPending };
}
