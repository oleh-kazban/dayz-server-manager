import { describe, expect, it } from 'vitest';

import { realtimeTicketResponseSchema, SSE_TICKET_TTL_MS } from './realtime.contract';

describe('realtime ticket contract (DSM-00348)', () => {
  it('accepts an opaque ticket with an ISO expiry', () => {
    const dto = { ticket: 'a'.repeat(43), expiresAt: '2026-11-17T18:00:30.000Z' };
    expect(realtimeTicketResponseSchema.parse(dto)).toEqual(dto);
  });

  it('rejects a short ticket or a non-ISO expiry', () => {
    expect(
      realtimeTicketResponseSchema.safeParse({ ticket: 'short', expiresAt: '2026-11-17T18:00:30Z' })
        .success,
    ).toBe(false);
    expect(
      realtimeTicketResponseSchema.safeParse({ ticket: 'a'.repeat(43), expiresAt: 'soon' }).success,
    ).toBe(false);
  });

  it('keeps tickets short-lived', () => {
    expect(SSE_TICKET_TTL_MS).toBe(30_000);
  });
});
