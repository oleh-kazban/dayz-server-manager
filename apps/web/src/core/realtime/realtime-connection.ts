export const REALTIME_SSE_PATH = '/api/v1/realtime/sse';
export const RECONNECT_INITIAL_DELAY_MS = 1_000;
export const RECONNECT_MAX_DELAY_MS = 30_000;

export type RealtimeState = 'connecting' | 'open' | 'reconnecting' | 'closed';

/** The part of `EventSource` the connection uses (a fake implements it in tests). */
export interface EventSourceLike {
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

export interface RealtimeConnectionOptions {
  /**
   * A fresh single-use SSE ticket for every (re)connect (DSM-00348), or `null` while signed out.
   * A rejected promise counts as a failed attempt.
   */
  getTicket: () => Promise<string | null>;
  /** Event names to subscribe to. */
  events: readonly string[];
  /** Receives each event's parsed JSON payload; malformed payloads are dropped. */
  onEvent: (event: string, data: unknown) => void;
  onStateChange?: (state: RealtimeState) => void;
  createEventSource?: (url: string) => EventSourceLike;
  path?: string;
}

/** Delay before reconnect attempt `attempt` (0-based): 1 s, 2 s, 4 s … capped at 30 s. */
export function reconnectDelay(attempt: number): number {
  return Math.min(RECONNECT_INITIAL_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
}

/**
 * One authenticated EventSource with app-controlled reconnection (DSM-00173). A native
 * EventSource gives up after an HTTP error and would reuse its old URL, so every error closes it
 * and a new one is opened after a backoff, with a new single-use ticket (DSM-00348): the access
 * token never appears in a URL.
 */
export class RealtimeConnection {
  private source: EventSourceLike | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  /** Bumped by every connect and stop, so a ticket that arrives late is discarded. */
  private generation = 0;
  private stopped = true;
  private currentState: RealtimeState = 'closed';

  constructor(private readonly options: RealtimeConnectionOptions) {}

  get state(): RealtimeState {
    return this.currentState;
  }

  start(): void {
    if (!this.stopped) {
      return;
    }
    this.stopped = false;
    this.attempt = 0;
    this.setState('connecting');
    this.connect();
  }

  /** Closes the EventSource and cancels any pending reconnect. Idempotent. */
  stop(): void {
    this.stopped = true;
    this.generation += 1;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.closeSource();
    this.setState('closed');
  }

  private connect(): void {
    this.timer = null;
    const generation = ++this.generation;
    this.options.getTicket().then(
      ticket => this.open(generation, ticket),
      () => this.open(generation, null),
    );
  }

  private open(generation: number, ticket: string | null): void {
    if (this.stopped || generation !== this.generation) {
      return; // Stopped, or superseded while the ticket was being requested.
    }
    if (!ticket) {
      this.scheduleReconnect();
      return;
    }

    const path = this.options.path ?? REALTIME_SSE_PATH;
    const create = this.options.createEventSource ?? (url => new EventSource(url));
    let source: EventSourceLike;
    try {
      source = create(`${path}?ticket=${encodeURIComponent(ticket)}`);
    } catch {
      // No EventSource support (or a test DOM): treat like a failed connection.
      this.scheduleReconnect();
      return;
    }
    this.source = source;

    source.onopen = () => {
      this.attempt = 0;
      this.setState('open');
    };
    source.onerror = () => {
      this.closeSource();
      this.scheduleReconnect();
    };
    for (const event of this.options.events) {
      source.addEventListener(event, message => {
        if (this.source !== source) {
          return; // Late message from a closed or replaced EventSource.
        }
        let data: unknown;
        try {
          data = JSON.parse(message.data);
        } catch {
          return;
        }
        this.options.onEvent(event, data);
      });
    }
  }

  private scheduleReconnect(): void {
    this.setState('reconnecting');
    const delay = reconnectDelay(this.attempt);
    this.attempt += 1;
    this.timer = setTimeout(() => this.connect(), delay);
  }

  private closeSource(): void {
    if (!this.source) {
      return;
    }
    this.source.onopen = null;
    this.source.onerror = null;
    this.source.close();
    this.source = null;
  }

  private setState(state: RealtimeState): void {
    if (this.currentState !== state) {
      this.currentState = state;
      this.options.onStateChange?.(state);
    }
  }
}
