import type { FastifyReply, FastifyRequest } from 'fastify';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SseHub } from './sse-hub';

interface MockRawResponse extends EventEmitter {
  writeHead: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  writableEnded: boolean;
  destroyed: boolean;
}

function createMockRawResponse(): MockRawResponse {
  const emitter = new EventEmitter() as MockRawResponse;
  emitter.writeHead = vi.fn();
  emitter.write = vi.fn();
  emitter.end = vi.fn().mockImplementation(() => {
    emitter.writableEnded = true;
  });
  emitter.writableEnded = false;
  emitter.destroyed = false;
  return emitter;
}

function createMockReply(raw: MockRawResponse = createMockRawResponse()): FastifyReply {
  return { raw } as unknown as FastifyReply;
}

function createMockRequest(): FastifyRequest {
  const raw = new EventEmitter();
  return { raw } as unknown as FastifyRequest;
}

describe('SseHub (apps/server/src/services/realtime)', () => {
  let hub: SseHub;

  beforeEach(() => {
    vi.useFakeTimers();
    hub = new SseHub();
  });

  afterEach(() => {
    hub.close();
    vi.useRealTimers();
  });

  describe('subscribe', () => {
    it('sets SSE headers, sends connection message, and returns unique clientId', () => {
      const raw = createMockRawResponse();
      const reply = createMockReply(raw);

      const clientId = hub.subscribe(reply);

      expect(typeof clientId).toBe('string');
      expect(clientId.length).toBeGreaterThan(0);

      expect(raw.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      expect(raw.write).toHaveBeenCalledWith(`: connected client=${clientId}\n\n`);
    });

    it('does not write chunk if raw response is already destroyed or ended', () => {
      const raw = createMockRawResponse();
      const reply = createMockReply(raw);
      const clientId = hub.subscribe(reply);

      // Verify normal write
      raw.write.mockClear();
      hub.sendTo(clientId, 'test.event', { msg: 'ok' });
      expect(raw.write).toHaveBeenCalled();

      // Case 1: destroyed
      raw.write.mockClear();
      raw.destroyed = true;
      hub.sendTo(clientId, 'test.event', { msg: 'noop' });
      expect(raw.write).not.toHaveBeenCalled();

      // Case 2: writableEnded
      raw.destroyed = false;
      raw.writableEnded = true;
      hub.sendTo(clientId, 'test.event', { msg: 'noop' });
      expect(raw.write).not.toHaveBeenCalled();
    });

    it('unsubscribes client when reply raw emits close, finish, or error', () => {
      // Test close
      const rawClose = createMockRawResponse();
      const idClose = hub.subscribe(createMockReply(rawClose));
      expect(hub.sendTo(idClose, 'e', {})).toBe(true);
      rawClose.emit('close');
      expect(hub.sendTo(idClose, 'e', {})).toBe(false);

      // Test finish
      const rawFinish = createMockRawResponse();
      const idFinish = hub.subscribe(createMockReply(rawFinish));
      expect(hub.sendTo(idFinish, 'e', {})).toBe(true);
      rawFinish.emit('finish');
      expect(hub.sendTo(idFinish, 'e', {})).toBe(false);

      // Test error
      const rawError = createMockRawResponse();
      const idError = hub.subscribe(createMockReply(rawError));
      expect(hub.sendTo(idError, 'e', {})).toBe(true);
      rawError.emit('error', new Error('stream reset'));
      expect(hub.sendTo(idError, 'e', {})).toBe(false);
    });

    it('unsubscribes client when request raw emits close', () => {
      const rawReply = createMockRawResponse();
      const req = createMockRequest();
      const id = hub.subscribe(createMockReply(rawReply), req);

      expect(hub.sendTo(id, 'ping', {})).toBe(true);
      req.raw.emit('close');
      expect(hub.sendTo(id, 'ping', {})).toBe(false);
    });
  });

  describe('broadcast', () => {
    it('dispatches formatted SSE event payload to all subscribed clients', () => {
      const raw1 = createMockRawResponse();
      const raw2 = createMockRawResponse();
      hub.subscribe(createMockReply(raw1));
      hub.subscribe(createMockReply(raw2));

      raw1.write.mockClear();
      raw2.write.mockClear();

      hub.broadcast('server.status', { status: 'RUNNING', online: true });

      const expected = 'event: server.status\ndata: {"status":"RUNNING","online":true}\n\n';
      expect(raw1.write).toHaveBeenCalledWith(expected);
      expect(raw2.write).toHaveBeenCalledWith(expected);
    });

    it('removes client from registry if write throws during broadcast', () => {
      const rawFaulty = createMockRawResponse();
      rawFaulty.write.mockImplementation((chunk: string) => {
        if (!chunk.startsWith(': connected')) {
          throw new Error('Broken pipe');
        }
      });
      const faultyId = hub.subscribe(createMockReply(rawFaulty));

      const rawHealthy = createMockRawResponse();
      const healthyId = hub.subscribe(createMockReply(rawHealthy));

      hub.broadcast('alert', { type: 'WARN' });

      // Faulty client was removed; healthy client remains
      expect(hub.sendTo(faultyId, 'check', {})).toBe(false);
      expect(hub.sendTo(healthyId, 'check', {})).toBe(true);
    });
  });

  describe('sendTo', () => {
    it('returns false when target clientId does not exist', () => {
      expect(hub.sendTo('non-existent-uuid', 'event', {})).toBe(false);
    });

    it('sends event to specific client and returns true', () => {
      const raw = createMockRawResponse();
      const id = hub.subscribe(createMockReply(raw));
      raw.write.mockClear();

      const ok = hub.sendTo(id, 'steam.challenge', { code: 123 });
      expect(ok).toBe(true);
      expect(raw.write).toHaveBeenCalledWith('event: steam.challenge\ndata: {"code":123}\n\n');
    });

    it('removes client and returns false if write throws', () => {
      const raw = createMockRawResponse();
      const id = hub.subscribe(createMockReply(raw));
      raw.write.mockImplementation((chunk: string) => {
        if (!chunk.startsWith(': connected')) {
          throw new Error('EPIPE');
        }
      });

      const ok = hub.sendTo(id, 'test', {});
      expect(ok).toBe(false);
      expect(hub.sendTo(id, 'test', {})).toBe(false);
    });
  });

  describe('heartbeat', () => {
    it('dispatches periodic ping comments every 15 seconds', async () => {
      const raw = createMockRawResponse();
      hub.subscribe(createMockReply(raw));
      raw.write.mockClear();

      await vi.advanceTimersByTimeAsync(15_000);

      expect(raw.write).toHaveBeenCalledWith(': ping\n\n');
    });

    it('handles write errors during heartbeat by pruning dead client', () => {
      const raw = createMockRawResponse();
      const id = hub.subscribe(createMockReply(raw));
      raw.write.mockImplementation((chunk: string) => {
        if (!chunk.startsWith(': connected')) {
          throw new Error('Connection closed');
        }
      });

      hub.heartbeat();

      expect(hub.sendTo(id, 'test', {})).toBe(false);
    });
  });

  describe('close', () => {
    it('clears heartbeat interval and closes all active client connections', () => {
      const raw1 = createMockRawResponse();
      const raw2 = createMockRawResponse();
      const id1 = hub.subscribe(createMockReply(raw1));
      const id2 = hub.subscribe(createMockReply(raw2));

      hub.close();

      expect(raw1.end).toHaveBeenCalled();
      expect(raw2.end).toHaveBeenCalled();
      expect(hub.sendTo(id1, 'event', {})).toBe(false);
      expect(hub.sendTo(id2, 'event', {})).toBe(false);
    });

    it('handles exception during client.close gracefully', () => {
      const raw = createMockRawResponse();
      raw.end.mockImplementation(() => {
        throw new Error('Already ended');
      });
      hub.subscribe(createMockReply(raw));

      expect(() => hub.close()).not.toThrow();
    });
  });
});
