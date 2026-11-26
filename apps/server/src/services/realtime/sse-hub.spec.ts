import type { FastifyReply, FastifyRequest } from 'fastify';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type SseClient, SseHub } from './sse-hub';

const IDENTITY = { userId: 'user-1', sid: 'sid-1' };

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

      const clientId = hub.subscribe(reply, IDENTITY);

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
      const clientId = hub.subscribe(reply, IDENTITY);

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
      const idClose = hub.subscribe(createMockReply(rawClose), IDENTITY);
      expect(hub.sendTo(idClose, 'e', {})).toBe(true);
      rawClose.emit('close');
      expect(hub.sendTo(idClose, 'e', {})).toBe(false);

      // Test finish
      const rawFinish = createMockRawResponse();
      const idFinish = hub.subscribe(createMockReply(rawFinish), IDENTITY);
      expect(hub.sendTo(idFinish, 'e', {})).toBe(true);
      rawFinish.emit('finish');
      expect(hub.sendTo(idFinish, 'e', {})).toBe(false);

      // Test error
      const rawError = createMockRawResponse();
      const idError = hub.subscribe(createMockReply(rawError), IDENTITY);
      expect(hub.sendTo(idError, 'e', {})).toBe(true);
      rawError.emit('error', new Error('stream reset'));
      expect(hub.sendTo(idError, 'e', {})).toBe(false);
    });

    it('unsubscribes client when request raw emits close', () => {
      const rawReply = createMockRawResponse();
      const req = createMockRequest();
      const id = hub.subscribe(createMockReply(rawReply), IDENTITY, req);

      expect(hub.sendTo(id, 'ping', {})).toBe(true);
      req.raw.emit('close');
      expect(hub.sendTo(id, 'ping', {})).toBe(false);
    });
  });

  describe('broadcast', () => {
    it('dispatches formatted SSE event payload to all subscribed clients', () => {
      const raw1 = createMockRawResponse();
      const raw2 = createMockRawResponse();
      hub.subscribe(createMockReply(raw1), IDENTITY);
      hub.subscribe(createMockReply(raw2), IDENTITY);

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
      const faultyId = hub.subscribe(createMockReply(rawFaulty), IDENTITY);

      const rawHealthy = createMockRawResponse();
      const healthyId = hub.subscribe(createMockReply(rawHealthy), IDENTITY);

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
      const id = hub.subscribe(createMockReply(raw), IDENTITY);
      raw.write.mockClear();

      const ok = hub.sendTo(id, 'steam.challenge', { code: 123 });
      expect(ok).toBe(true);
      expect(raw.write).toHaveBeenCalledWith('event: steam.challenge\ndata: {"code":123}\n\n');
    });

    it('removes client and returns false if write throws', () => {
      const raw = createMockRawResponse();
      const id = hub.subscribe(createMockReply(raw), IDENTITY);
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
      hub.subscribe(createMockReply(raw), IDENTITY);
      raw.write.mockClear();

      await vi.advanceTimersByTimeAsync(15_000);

      expect(raw.write).toHaveBeenCalledWith(': ping\n\n');
    });

    it('handles write errors during heartbeat by pruning dead client', () => {
      const raw = createMockRawResponse();
      const id = hub.subscribe(createMockReply(raw), IDENTITY);
      raw.write.mockImplementation((chunk: string) => {
        if (!chunk.startsWith(': connected')) {
          throw new Error('Connection closed');
        }
      });

      hub.heartbeat();

      expect(hub.sendTo(id, 'test', {})).toBe(false);
    });
  });

  describe('session streams (AC-9, AC-10)', () => {
    const open = (sid: string, userId = 'user-1') => {
      const raw = createMockRawResponse();
      const id = hub.subscribe(createMockReply(raw), { userId, sid });
      return { raw, id };
    };

    it('stores the user id and session id of every client (R-SSE-1)', () => {
      const { id } = open('sid-a', 'user-a');
      const clients = (hub as unknown as { clients: Map<string, SseClient> }).clients;

      expect(clients.get(id)).toMatchObject({ userId: 'user-a', sid: 'sid-a' });
    });

    it('closes every stream of the session and leaves other sessions open', () => {
      const a1 = open('sid-a');
      const a2 = open('sid-a');
      const b = open('sid-b');

      const closed = hub.closeSession('sid-a');

      expect(closed).toBe(2);
      expect(a1.raw.end).toHaveBeenCalled();
      expect(a2.raw.end).toHaveBeenCalled();
      expect(b.raw.end).not.toHaveBeenCalled();
      expect(hub.sendTo(a1.id, 'e', {})).toBe(false);
      expect(hub.sendTo(b.id, 'e', {})).toBe(true);
    });

    it('does not close streams of another session of the same user', () => {
      const other = open('sid-b', 'user-1');
      open('sid-a', 'user-1');

      hub.closeSession('sid-a');

      expect(other.raw.end).not.toHaveBeenCalled();
    });

    it('returns 0 for a session without streams', () => {
      open('sid-a');

      expect(hub.closeSession('unknown')).toBe(0);
    });

    it('keeps closing the remaining streams when one close throws', () => {
      const bad = open('sid-a');
      bad.raw.end.mockImplementation(() => {
        throw new Error('Already ended');
      });
      const good = open('sid-a');

      expect(() => hub.closeSession('sid-a')).not.toThrow();
      expect(good.raw.end).toHaveBeenCalled();
    });

    it('closes streams whose session is missing at the heartbeat and keeps live ones', () => {
      const gone = open('sid-gone');
      const live = open('sid-live');
      hub.setSessionCheck(sid => sid === 'sid-live');

      hub.heartbeat();

      expect(gone.raw.end).toHaveBeenCalled();
      expect(live.raw.end).not.toHaveBeenCalled();
      expect(hub.sendTo(gone.id, 'e', {})).toBe(false);
      expect(hub.sendTo(live.id, 'e', {})).toBe(true);
    });

    it('rechecks on the 15 second timer', async () => {
      const gone = open('sid-gone');
      hub.setSessionCheck(() => false);

      await vi.advanceTimersByTimeAsync(15_000);

      expect(gone.raw.end).toHaveBeenCalled();
    });

    it('asks the check once per distinct session id, with that id', () => {
      open('sid-a');
      open('sid-b');
      const check = vi.fn().mockReturnValue(true);
      hub.setSessionCheck(check);

      hub.heartbeat();

      expect(check.mock.calls.map(c => c[0]).sort()).toEqual(['sid-a', 'sid-b']);
    });

    it('asks the check exactly once for two clients of the same session', () => {
      open('sid-a');
      open('sid-a');
      const check = vi.fn().mockReturnValue(true);
      hub.setSessionCheck(check);

      hub.heartbeat();

      expect(check).toHaveBeenCalledTimes(1);
      expect(check).toHaveBeenCalledWith('sid-a');
    });

    it('fails closed: closes the streams of a session whose check throws, and still checks the others', () => {
      const broken1 = open('sid-broken');
      const broken2 = open('sid-broken');
      const live = open('sid-live');
      const gone = open('sid-gone');
      hub.setSessionCheck(sid => {
        if (sid === 'sid-broken') throw new Error('database is locked');
        return sid === 'sid-live';
      });
      live.raw.write.mockClear();

      expect(() => hub.heartbeat()).not.toThrow();

      expect(broken1.raw.end).toHaveBeenCalled();
      expect(broken2.raw.end).toHaveBeenCalled();
      expect(gone.raw.end).toHaveBeenCalled();
      expect(live.raw.end).not.toHaveBeenCalled();
      expect(live.raw.write).toHaveBeenCalledWith(': ping\n\n');
      expect(hub.sendTo(broken1.id, 'e', {})).toBe(false);
    });

    it('checks nothing once the check is cleared', () => {
      const a = open('sid-a');
      hub.setSessionCheck(() => false);
      hub.setSessionCheck(null);

      hub.heartbeat();

      expect(a.raw.end).not.toHaveBeenCalled();
    });

    it('still pings the live streams after closing the dead ones', () => {
      const live = open('sid-live');
      open('sid-gone');
      hub.setSessionCheck(sid => sid === 'sid-live');
      live.raw.write.mockClear();

      hub.heartbeat();

      expect(live.raw.write).toHaveBeenCalledWith(': ping\n\n');
    });
  });

  describe('session check errors and tracked streams (AC-9)', () => {
    const open = (sid: string) => {
      const raw = createMockRawResponse();
      hub.subscribe(createMockReply(raw), { userId: 'user-1', sid });
      return raw;
    };

    it('reports each failing session once with the error and the session id', () => {
      open('sid-bad');
      open('sid-bad');
      open('sid-ok');
      const error = new Error('database is locked');
      const onError = vi.fn();
      hub.setSessionCheck(sid => {
        if (sid === 'sid-bad') throw error;
        return true;
      }, onError);

      hub.heartbeat();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error, 'sid-bad');
    });

    it('swallows an error handler that throws and still closes the other sessions', () => {
      const bad = open('sid-bad');
      const gone = open('sid-gone');
      hub.setSessionCheck(
        sid => {
          if (sid === 'sid-bad') throw new Error('locked');
          return false;
        },
        () => {
          throw new Error('logger down');
        },
      );

      expect(() => hub.heartbeat()).not.toThrow();

      expect(bad.end).toHaveBeenCalled();
      expect(gone.end).toHaveBeenCalled();
    });

    it('closes a tracked stream with its session and leaves other sessions', () => {
      const closeA = vi.fn();
      const closeB = vi.fn();
      hub.track({ userId: 'user-1', sid: 'sid-a' }, closeA);
      hub.track({ userId: 'user-1', sid: 'sid-b' }, closeB);

      expect(hub.closeSession('sid-a')).toBe(1);

      expect(closeA).toHaveBeenCalledTimes(1);
      expect(closeB).not.toHaveBeenCalled();
    });

    it('keeps a tracked stream open through a heartbeat and a broadcast', () => {
      const close = vi.fn();
      hub.track({ userId: 'user-1', sid: 'sid-a' }, close);
      hub.setSessionCheck(() => true);

      expect(() => {
        hub.heartbeat();
        hub.broadcast('e', {});
      }).not.toThrow();

      expect(close).not.toHaveBeenCalled();
      expect(hub.closeSession('sid-a')).toBe(1);
    });

    it('closes a tracked stream whose session check fails at the heartbeat', () => {
      const close = vi.fn();
      hub.track({ userId: 'user-1', sid: 'sid-a' }, close);
      hub.setSessionCheck(() => false);

      hub.heartbeat();

      expect(close).toHaveBeenCalledTimes(1);
    });

    it('stops tracking after the returned function is called', () => {
      const close = vi.fn();
      const untrack = hub.track({ userId: 'user-1', sid: 'sid-a' }, close);

      untrack();

      expect(hub.closeSession('sid-a')).toBe(0);
      expect(close).not.toHaveBeenCalled();
    });

    it('keeps closing other tracked streams when one close throws', () => {
      const good = vi.fn();
      hub.track({ userId: 'user-1', sid: 'sid-a' }, () => {
        throw new Error('already ended');
      });
      hub.track({ userId: 'user-1', sid: 'sid-a' }, good);

      expect(() => hub.closeSession('sid-a')).not.toThrow();

      expect(good).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('clears heartbeat interval and closes all active client connections', () => {
      const raw1 = createMockRawResponse();
      const raw2 = createMockRawResponse();
      const id1 = hub.subscribe(createMockReply(raw1), IDENTITY);
      const id2 = hub.subscribe(createMockReply(raw2), IDENTITY);

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
      hub.subscribe(createMockReply(raw), IDENTITY);

      expect(() => hub.close()).not.toThrow();
    });
  });
});
