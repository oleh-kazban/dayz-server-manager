import { randomBytes } from 'node:crypto';

import { SSE_TICKET_TTL_MS, type UserRole } from '@aegis/api-contracts';

/** Who an SSE ticket was issued to; becomes `request.user` of the SSE connection. */
export interface SseTicketIdentity {
  sub: string;
  username?: string;
  role?: UserRole;
  sid?: string;
}

export interface SseTicketStoreOptions {
  ttlMs?: number;
  clock?: () => number;
  /** Ticket generator; 32 random bytes (256 bits) as base64url by default. */
  generate?: () => string;
}

interface StoredTicket {
  identity: SseTicketIdentity;
  expiresAt: number;
}

/**
 * Short-lived, single-use SSE tickets (DSM-00348). `EventSource` cannot send an Authorization
 * header; a ticket in the URL is harmless once used or expired, unlike the access token it
 * replaces. In memory only: a DSM restart invalidates outstanding tickets, and the web app
 * simply asks for a new one on reconnect.
 */
export class SseTicketStore {
  private readonly tickets = new Map<string, StoredTicket>();
  private readonly ttlMs: number;
  private readonly clock: () => number;
  private readonly generate: () => string;

  constructor(options: SseTicketStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? SSE_TICKET_TTL_MS;
    this.clock = options.clock ?? Date.now;
    this.generate = options.generate ?? (() => randomBytes(32).toString('base64url'));
  }

  issue(identity: SseTicketIdentity): { ticket: string; expiresAt: Date } {
    this.sweep();
    const ticket = this.generate();
    const expiresAt = this.clock() + this.ttlMs;
    this.tickets.set(ticket, { identity: { ...identity }, expiresAt });
    return { ticket, expiresAt: new Date(expiresAt) };
  }

  /** The identity of a valid ticket, which is used up by this call; `null` otherwise. */
  consume(ticket: string): SseTicketIdentity | null {
    const stored = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    if (!stored || stored.expiresAt <= this.clock()) {
      return null;
    }
    return stored.identity;
  }

  /** Outstanding tickets (diagnostics and tests). */
  get size(): number {
    return this.tickets.size;
  }

  private sweep(): void {
    const now = this.clock();
    for (const [ticket, stored] of this.tickets) {
      if (stored.expiresAt <= now) {
        this.tickets.delete(ticket);
      }
    }
  }
}
