import { z } from 'zod';

/** How long an SSE ticket can be used after it was issued (DSM-00348). */
export const SSE_TICKET_TTL_MS = 30_000;

/**
 * `POST /api/v1/realtime/ticket` (DSM-00348): a short-lived, single-use ticket that authorises
 * one `GET /api/v1/realtime/sse?ticket=…` connection. `EventSource` cannot send an
 * `Authorization` header, and a ticket keeps the access token out of URLs and request logs.
 */
export const realtimeTicketResponseSchema = z.object({
  ticket: z.string().min(32),
  expiresAt: z.string().datetime(),
});
export type RealtimeTicketDto = z.infer<typeof realtimeTicketResponseSchema>;
