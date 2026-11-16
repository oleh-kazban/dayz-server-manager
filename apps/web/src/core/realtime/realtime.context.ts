import { createContext, useContext } from 'react';

import type { RealtimeState } from './realtime-connection';

export const RealtimeStateContext = createContext<RealtimeState>('closed');

/** State of the shared realtime connection (`closed` outside the signed-in shell). */
export function useRealtimeState(): RealtimeState {
  return useContext(RealtimeStateContext);
}
