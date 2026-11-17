import { type ReactNode, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@aegis/api-client';
import { SERVER_STATUS_CHANGED_EVENT, SERVER_STOP_FAILED_EVENT } from '@aegis/api-contracts';

import { RealtimeStateContext } from './realtime.context';
import {
  type EventSourceLike,
  RealtimeConnection,
  type RealtimeState,
} from './realtime-connection';
import { applyServerStatusChanged } from './server-status.realtime';
import { applyServerStopFailed } from './server-stop-failed.realtime';

export interface RealtimeProviderProps {
  children: ReactNode;
  /** Test seam; defaults to the browser EventSource. */
  createEventSource?: (url: string) => EventSourceLike;
}

/**
 * Opens the tab's single SSE subscription for the signed-in shell and routes events into the
 * query cache (DSM-00173). Mounted in AuthedLayout, so signing out unmounts it and closes the
 * connection. Background events never toast.
 */
export function RealtimeProvider({ children, createEventSource }: RealtimeProviderProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<RealtimeState>('closed');

  useEffect(() => {
    const handlers: Record<string, (data: unknown) => void> = {
      [SERVER_STATUS_CHANGED_EVENT]: data => applyServerStatusChanged(queryClient, data),
      [SERVER_STOP_FAILED_EVENT]: data => applyServerStopFailed(queryClient, data),
    };
    const connection = new RealtimeConnection({
      getToken: () => apiClient.client.getToken(),
      events: Object.keys(handlers),
      onEvent: (event, data) => handlers[event]?.(data),
      onStateChange: setState,
      createEventSource,
    });
    connection.start();
    return () => connection.stop();
  }, [queryClient, createEventSource]);

  return <RealtimeStateContext.Provider value={state}>{children}</RealtimeStateContext.Provider>;
}
