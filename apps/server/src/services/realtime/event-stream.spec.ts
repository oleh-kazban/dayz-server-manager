import type { FastifyReply } from 'fastify';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openEventStream } from './event-stream';

class FakeRaw extends EventEmitter {
  writableEnded = false;
  destroyed = false;
  readonly chunks: string[] = [];
  headers: Record<string, string> | null = null;

  writeHead(status: number, headers: Record<string, string>) {
    this.headers = { status: String(status), ...headers };
  }

  write(chunk: string) {
    this.chunks.push(chunk);
  }
}

function fakeReply() {
  const raw = new FakeRaw();
  const reply = { raw, hijack: vi.fn() } as unknown as FastifyReply & { raw: FakeRaw };
  return { reply, raw };
}

describe('openEventStream (DSM-00206)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hijacks the reply, writes SSE headers, events and heartbeats', () => {
    const { reply, raw } = fakeReply();
    const stream = openEventStream(reply, 1_000);

    expect(reply.hijack).toHaveBeenCalled();
    expect(raw.headers).toMatchObject({ status: '200', 'Content-Type': 'text/event-stream' });
    stream.send('log.lines', { lines: ['a'] });
    vi.advanceTimersByTime(1_000);

    expect(raw.chunks).toEqual([
      ': connected\n\n',
      'event: log.lines\ndata: {"lines":["a"]}\n\n',
      ': ping\n\n',
    ]);
  });

  it('runs close listeners once and stops the heartbeat', () => {
    const { reply, raw } = fakeReply();
    const stream = openEventStream(reply, 1_000);
    const onClose = vi.fn();
    stream.onClose(onClose);

    raw.emit('close');
    raw.emit('error', new Error('reset'));
    vi.advanceTimersByTime(5_000);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(raw.chunks).toEqual([': connected\n\n']);
  });

  it('does not write to an ended or destroyed response', () => {
    const { reply, raw } = fakeReply();
    const stream = openEventStream(reply, 1_000);
    raw.writableEnded = true;
    stream.send('x', 1);
    raw.writableEnded = false;
    raw.destroyed = true;
    stream.send('x', 2);
    expect(raw.chunks).toEqual([': connected\n\n']);
  });
});
