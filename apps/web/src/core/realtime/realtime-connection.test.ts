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
  let token: string | null;
  let events: [string, unknown][];
  let states: string[];

  const connection = (overrides: Partial<RealtimeConnectionOptions> = {}) =>
    new RealtimeConnection({
      getToken: () => token,
      events: ['server.status.changed', 'other'],
      onEvent: (event, data) => events.push([event, data]),
      onStateChange: state => states.push(state),
      createEventSource: url => new FakeEventSource(url),
      ...overrides,
    });

  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances.length = 0;
    token = 'access token/1';
    events = [];
    states = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens one EventSource with the URL-encoded current token and parses events', () => {
    const rt = connection();
    rt.start();
    rt.start(); // idempotent

    expect(FakeEventSource.instances).toHaveLength(1);
    const source = FakeEventSource.latest();
    expect(source.url).toBe('/api/v1/realtime/sse?token=access%20token%2F1');
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

  it('reconnects with exponential backoff and a fresh token, resetting after a successful open', () => {
    const rt = connection();
    rt.start();

    FakeEventSource.latest().fail();
    expect(FakeEventSource.instances[0].closed).toBe(true);
    expect(rt.state).toBe('reconnecting');

    token = 'refreshed';
    vi.advanceTimersByTime(999);
    expect(FakeEventSource.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.latest().url).toBe('/api/v1/realtime/sse?token=refreshed');

    FakeEventSource.latest().fail();
    vi.advanceTimersByTime(1_999);
    expect(FakeEventSource.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(3);

    FakeEventSource.latest().open();
    FakeEventSource.latest().fail();
    vi.advanceTimersByTime(1_000);
    expect(FakeEventSource.instances).toHaveLength(4);
    expect(states).toEqual(['connecting', 'reconnecting', 'open', 'reconnecting']);
  });

  it('ignores late events from a closed EventSource', () => {
    const rt = connection();
    rt.start();
    const first = FakeEventSource.latest();
    first.fail();
    first.emit('server.status.changed', '{"late":true}');
    expect(events).toEqual([]);
  });

  it('waits with backoff while there is no token', () => {
    token = null;
    const rt = connection();
    rt.start();
    expect(FakeEventSource.instances).toHaveLength(0);
    expect(rt.state).toBe('reconnecting');

    token = 'now-signed-in';
    vi.advanceTimersByTime(1_000);
    expect(FakeEventSource.latest().url).toBe('/api/v1/realtime/sse?token=now-signed-in');
  });

  it('treats a throwing EventSource constructor as a failed attempt', () => {
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
    expect(rt.state).toBe('reconnecting');
    vi.advanceTimersByTime(1_000);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('stop closes the EventSource, cancels the reconnect and is idempotent', () => {
    const rt = connection();
    rt.start();
    FakeEventSource.latest().fail();
    rt.stop();
    rt.stop();
    vi.advanceTimersByTime(60_000);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(rt.state).toBe('closed');

    rt.start();
    const reopened = FakeEventSource.latest();
    rt.stop();
    expect(reopened.closed).toBe(true);
    expect(reopened.onopen).toBeNull();
  });

  it('uses the browser EventSource and a custom path when configured', () => {
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
        getToken: () => 't',
        events: [],
        onEvent: () => undefined,
        path: '/custom/sse',
      });
      rt.start();
      expect(created).toEqual(['/custom/sse?token=t']);
      rt.stop();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
