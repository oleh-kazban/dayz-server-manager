import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type EventSourceLike,
  RealtimeConnection,
  type RealtimeConnectionOptions,
  reconnectDelay,
} from './realtime-connection';

class FakeEventSource implements EventSourceLike {
  static readonly instances: FakeEventSource[] = [];
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  private readonly listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {
    this.closed = true;
  }

  open(): void {
    this.onopen?.(new Event('open'));
  }

  fail(): void {
    this.onerror?.(new Event('error'));
  }

  emit(type: string, data: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new MessageEvent(type, { data }));
    }
  }

  static latest(): FakeEventSource {
    return FakeEventSource.instances[FakeEventSource.instances.length - 1];
  }
}

describe('reconnectDelay', () => {
  it('doubles from 1 s and caps at 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(reconnectDelay)).toEqual([
      1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000,
    ]);
  });
});

describe('RealtimeConnection', () => {
  let ticket: string | null;
  let ticketError: Error | null;
  let ticketRequests: number;
  let events: [string, unknown][];
  let states: string[];

  const connection = (overrides: Partial<RealtimeConnectionOptions> = {}) =>
    new RealtimeConnection({
      getTicket: async () => {
        ticketRequests += 1;
        if (ticketError) {
          throw ticketError;
        }
        return ticket;
      },
      events: ['server.status.changed', 'other'],
      onEvent: (event, data) => events.push([event, data]),
      onStateChange: state => states.push(state),
      createEventSource: url => new FakeEventSource(url),
      ...overrides,
    });

  /** Lets the ticket request resolve (and advances fake time). */
  const advance = (ms = 0) => vi.advanceTimersByTimeAsync(ms);

  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances.length = 0;
    ticket = 'ticket a/1';
    ticketError = null;
    ticketRequests = 0;
    events = [];
    states = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens one EventSource with a URL-encoded ticket (never the token) and parses events', async () => {
    const rt = connection();
    rt.start();
    rt.start(); // idempotent
    await advance();

    expect(ticketRequests).toBe(1);
    expect(FakeEventSource.instances).toHaveLength(1);
    const source = FakeEventSource.latest();
    expect(source.url).toBe('/api/v1/realtime/sse?ticket=ticket%20a%2F1');
    expect(source.url).not.toContain('token');
    expect(rt.state).toBe('connecting');

    source.open();
    expect(rt.state).toBe('open');
    source.emit('server.status.changed', '{"serverId":"a","status":"running"}');
    source.emit('other', '[1,2]');
    source.emit('server.status.changed', 'not json');
    expect(events).toEqual([
      ['server.status.changed', { serverId: 'a', status: 'running' }],
      ['other', [1, 2]],
    ]);
    expect(states).toEqual(['connecting', 'open']);
  });

  it('reconnects with exponential backoff and a new ticket each time, resetting after an open', async () => {
    const rt = connection();
    rt.start();
    await advance();

    FakeEventSource.latest().fail();
    expect(FakeEventSource.instances[0].closed).toBe(true);
    expect(rt.state).toBe('reconnecting');

    ticket = 'second';
    await advance(999);
    expect(FakeEventSource.instances).toHaveLength(1);
    await advance(1);
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.latest().url).toBe('/api/v1/realtime/sse?ticket=second');
    expect(ticketRequests).toBe(2);

    FakeEventSource.latest().fail();
    await advance(1_999);
    expect(FakeEventSource.instances).toHaveLength(2);
    await advance(1);
    expect(FakeEventSource.instances).toHaveLength(3);

    FakeEventSource.latest().open();
    FakeEventSource.latest().fail();
    await advance(1_000);
    expect(FakeEventSource.instances).toHaveLength(4);
    expect(states).toEqual(['connecting', 'reconnecting', 'open', 'reconnecting']);
  });

  it('ignores late events from a closed EventSource', async () => {
    const rt = connection();
    rt.start();
    await advance();
    const first = FakeEventSource.latest();
    first.fail();
    first.emit('server.status.changed', '{"late":true}');
    expect(events).toEqual([]);
  });

  it('waits with backoff while signed out (no ticket) or when the ticket request fails', async () => {
    ticket = null;
    const rt = connection();
    rt.start();
    await advance();
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(rt.state).toBe('reconnecting');

    ticket = 'now-signed-in';
    ticketError = new Error('500');
    await advance(1_000);
    expect(FakeEventSource.instances).toHaveLength(0);

    ticketError = null;
    await advance(2_000);
    expect(FakeEventSource.latest().url).toBe('/api/v1/realtime/sse?ticket=now-signed-in');
  });

  it('discards a ticket that arrives after stop', async () => {
    const pending: { resolve?: (value: string) => void } = {};
    const rt = connection({
      getTicket: () =>
        new Promise<string>(resolve => {
          pending.resolve = resolve;
        }),
    });
    rt.start();
    rt.stop();
    pending.resolve?.('late');
    await advance();
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(rt.state).toBe('closed');
  });

  it('discards a ticket of an earlier start once restarted', async () => {
    const resolvers: ((value: string) => void)[] = [];
    const rt = connection({
      getTicket: () => new Promise<string>(resolve => resolvers.push(resolve)),
    });
    rt.start();
    rt.stop();
    rt.start();
    resolvers[0]('stale');
    resolvers[1]('fresh');
    await advance();
    expect(FakeEventSource.instances.map(source => source.url)).toEqual([
      '/api/v1/realtime/sse?ticket=fresh',
    ]);
  });

  it('treats a throwing EventSource constructor as a failed attempt', async () => {
    let calls = 0;
    const rt = connection({
      createEventSource: url => {
        calls += 1;
        if (calls === 1) {
          throw new ReferenceError('EventSource is not defined');
        }
        return new FakeEventSource(url);
      },
    });
    rt.start();
    await advance();
    expect(rt.state).toBe('reconnecting');
    await advance(1_000);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('stop closes the EventSource, cancels the reconnect and is idempotent', async () => {
    const rt = connection();
    rt.start();
    await advance();
    FakeEventSource.latest().fail();
    rt.stop();
    rt.stop();
    await advance(60_000);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(rt.state).toBe('closed');

    rt.start();
    await advance();
    const reopened = FakeEventSource.latest();
    rt.stop();
    expect(reopened.closed).toBe(true);
    expect(reopened.onopen).toBeNull();
  });

  it('uses the browser EventSource and a custom path when configured', async () => {
    const created: string[] = [];
    vi.stubGlobal(
      'EventSource',
      class extends FakeEventSource {
        constructor(url: string) {
          super(url);
          created.push(url);
        }
      },
    );
    try {
      const rt = new RealtimeConnection({
        getTicket: async () => 't',
        events: [],
        onEvent: () => undefined,
        path: '/custom/sse',
      });
      rt.start();
      await advance();
      expect(created).toEqual(['/custom/sse?ticket=t']);
      rt.stop();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
