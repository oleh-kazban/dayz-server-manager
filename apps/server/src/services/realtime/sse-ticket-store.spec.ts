import { describe, expect, it } from 'vitest';

import { SseTicketStore } from './sse-ticket-store';

const identity = { sub: 'user-1', username: 'admin', role: 'admin' as const, sid: 'session-1' };

describe('SseTicketStore (DSM-00348)', () => {
  it('issues random 256-bit base64url tickets that expire after 30 s by default', () => {
    let now = 1_000;
    const store = new SseTicketStore({ clock: () => now });

    const first = store.issue(identity);
    const second = store.issue(identity);

    expect(first.ticket).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second.ticket).not.toBe(first.ticket);
    expect(first.expiresAt).toEqual(new Date(31_000));
    now = 30_999;
    expect(store.consume(first.ticket)).toEqual(identity);
  });

  it('is single-use', () => {
    const store = new SseTicketStore();
    const { ticket } = store.issue(identity);
    expect(store.consume(ticket)).toEqual(identity);
    expect(store.consume(ticket)).toBeNull();
  });

  it('rejects unknown and expired tickets', () => {
    let now = 0;
    const store = new SseTicketStore({ ttlMs: 100, clock: () => now });
    const { ticket } = store.issue(identity);

    expect(store.consume('not-a-ticket')).toBeNull();
    now = 100;
    expect(store.consume(ticket)).toBeNull();
  });

  it('copies the identity and sweeps expired tickets when issuing', () => {
    let now = 0;
    let counter = 0;
    const store = new SseTicketStore({
      ttlMs: 100,
      clock: () => now,
      generate: () => `t${counter++}`,
    });
    const mutable = { ...identity };
    store.issue(mutable);
    store.issue(identity);
    mutable.role = 'viewer' as never;
    expect(store.size).toBe(2);

    now = 100;
    store.issue(identity);
    expect(store.size).toBe(1);
    expect(store.consume('t2')).toEqual(identity);
  });
});
