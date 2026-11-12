import type { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

export interface SseClient {
  id: string;
  reply: FastifyReply;
  write: (chunk: string) => void;
  close: () => void;
}

export class SseHub {
  private clients = new Map<string, SseClient>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat();
    }, 15_000);
    this.heartbeatInterval.unref();
  }

  public subscribe(reply: FastifyReply, request?: FastifyRequest): string {
    const clientId = crypto.randomUUID();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const write = (chunk: string) => {
      if (!reply.raw.writableEnded && !reply.raw.destroyed) {
        reply.raw.write(chunk);
      }
    };

    const client: SseClient = {
      id: clientId,
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

  public heartbeat(): void {
    const ping = ': ping\n\n';
    for (const [id, client] of this.clients.entries()) {
      try {
        client.write(ping);
      } catch {
        this.clients.delete(id);
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
