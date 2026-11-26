import type { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

import { SECURITY_HEADERS } from '../../app/security-headers';

export interface SseClient {
  id: string;
  userId: string;
  sid: string;
  reply?: FastifyReply;
  write: (chunk: string) => void;
  close: () => void;
}

export class SseHub {
  private clients = new Map<string, SseClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionCheck: ((sid: string) => boolean) | null = null;
  private onCheckError: ((error: unknown, sid: string) => void) | null = null;

  constructor() {
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, 15_000);
    this.heartbeatInterval.unref();
  }

  /** Called at every heartbeat with each client's session id; false closes that client. */
  public setSessionCheck(
    check: ((sid: string) => boolean) | null,
    onError?: (error: unknown, sid: string) => void,
  ): void {
    this.sessionCheck = check;
    this.onCheckError = onError ?? null;
  }

  /**
   * Registers a stream that owns its response and heartbeat (log streams): the hub only ends it
   * with the session. Returns the function that unregisters it.
   */
  public track(identity: { userId: string; sid: string }, close: () => void): () => void {
    const id = crypto.randomUUID();
    this.clients.set(id, { id, ...identity, write: () => undefined, close });
    return () => {
      this.clients.delete(id);
    };
  }

  public subscribe(
    reply: FastifyReply,
    identity: { userId: string; sid: string },
    request?: FastifyRequest,
  ): string {
    const clientId = crypto.randomUUID();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...SECURITY_HEADERS,
    });

    const write = (chunk: string) => {
      if (!reply.raw.writableEnded && !reply.raw.destroyed) {
        reply.raw.write(chunk);
      }
    };

    const client: SseClient = {
      id: clientId,
      userId: identity.userId,
      sid: identity.sid,
      reply,
      write,
      close: () => {
        if (!reply.raw.writableEnded) {
          reply.raw.end();
        }
      },
    };

    this.clients.set(clientId, client);

    write(`: connected client=${clientId}\n\n`);

    const cleanup = () => {
      this.clients.delete(clientId);
    };

    reply.raw.on('close', cleanup);
    reply.raw.on('finish', cleanup);
    reply.raw.on('error', cleanup);
    if (request?.raw) {
      request.raw.on('close', cleanup);
    }

    return clientId;
  }

  public broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.clients.entries()) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  public sendTo(clientId: string, event: string, data: unknown): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      client.write(payload);
      return true;
    } catch {
      this.clients.delete(clientId);
      return false;
    }
  }

  /** Ends every stream of the session and returns how many there were. */
  public closeSession(sid: string): number {
    let closed = 0;
    for (const [id, client] of [...this.clients.entries()]) {
      if (client.sid !== sid) continue;
      this.clients.delete(id);
      closed += 1;
      try {
        client.close();
      } catch {
        // Ignore: the remaining streams must still close
      }
    }
    return closed;
  }

  public heartbeat(): void {
    this.closeEndedSessions();
    const ping = ': ping\n\n';
    for (const [id, client] of this.clients.entries()) {
      try {
        client.write(ping);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  private closeEndedSessions(): void {
    const check = this.sessionCheck;
    if (!check) return;
    for (const sid of new Set([...this.clients.values()].map(c => c.sid))) {
      try {
        if (!check(sid)) this.closeSession(sid);
      } catch (error) {
        // Fail closed: a session that cannot be verified must not keep a stream
        this.closeSession(sid);
        try {
          this.onCheckError?.(error, sid);
        } catch {
          // Ignore: logging must not stop the heartbeat
        }
      }
    }
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const client of this.clients.values()) {
      try {
        client.close();
      } catch {
        // Ignore
      }
    }
    this.clients.clear();
  }
}

export const sseHub = new SseHub();
