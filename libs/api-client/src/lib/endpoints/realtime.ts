import { type RealtimeTicketDto, realtimeTicketResponseSchema } from '@aegis/api-contracts';

import { type HttpClient } from '../http-client';

export function createRealtimeEndpoint(client: HttpClient) {
  return {
    /**
     * Single-use ticket for one SSE connection, valid for 30 s (DSM-00348). Open the stream with
     * `/api/v1/realtime/sse?ticket=…`; never put the access token in a URL.
     */
    createTicket: (): Promise<RealtimeTicketDto> =>
      client.post('/api/v1/realtime/ticket', realtimeTicketResponseSchema),
  };
}
