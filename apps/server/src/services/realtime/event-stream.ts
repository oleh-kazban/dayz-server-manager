import type { FastifyReply } from 'fastify';

/** Heartbeat comment interval: keeps proxies from closing an idle stream. */
export const EVENT_STREAM_HEARTBEAT_MS = 15_000;

export interface EventStream {
  send: (event: string, data: unknown) => void;
  /** Runs once when the client disconnects (or the stream is ended). */
  onClose: (listener: () => void) => void;
}

/**
 * Opens a dedicated server-sent events response for one client (DSM-00206), as opposed to the
 * broadcast hub: the caller owns the reply (`reply.hijack()` is called here).
 */
export function openEventStream(
  reply: FastifyReply,
  heartbeatMs = EVENT_STREAM_HEARTBEAT_MS,
): EventStream {
  reply.hijack();
  const raw = reply.raw;
  raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const write = (chunk: string) => {
    if (!raw.writableEnded && !raw.destroyed) {
      raw.write(chunk);
    }
  };
  write(': connected\n\n');

  const listeners: (() => void)[] = [];
  const heartbeat = setInterval(() => write(': ping\n\n'), heartbeatMs);
  heartbeat.unref();
  let closed = false;
  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    clearInterval(heartbeat);
    for (const listener of listeners) {
      listener();
    }
  };
  raw.on('close', close);
  raw.on('error', close);

  return {
    send: (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    onClose: listener => {
      listeners.push(listener);
    },
  };
}
