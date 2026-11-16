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
  /** Current access token; read again on every (re)connect. */
  getToken: () => string | null;
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
 * EventSource gives up after an HTTP error such as an expired token and would reuse its old URL,
 * so every error closes it and a new one is opened after a backoff, with the current token.
 */
export class RealtimeConnection {
  private source: EventSourceLike | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
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
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.closeSource();
    this.setState('closed');
  }

  private connect(): void {
    this.timer = null;
    const token = this.options.getToken();
    if (!token) {
      this.scheduleReconnect();
      return;
    }

    const path = this.options.path ?? REALTIME_SSE_PATH;
    const create = this.options.createEventSource ?? (url => new EventSource(url));
    let source: EventSourceLike;
    try {
      source = create(`${path}?token=${encodeURIComponent(token)}`);
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
