import dgram from 'node:dgram';

import { decodePacket, encodeLoginPacket } from './packet';

export const DEFAULT_RCON_TIMEOUT_MS = 5_000;

export type RconLoginError = 'login_failed' | 'timeout' | 'unreachable';

/** Network outcomes are values, not exceptions. Messages never contain the password. */
export type RconLoginResult = { ok: true } | { ok: false; error: RconLoginError; message: string };

export interface BattlEyeRconClientOptions {
  host: string;
  port: number;
  password: string;
  /** How long to wait for the login response. */
  timeoutMs?: number;
  /** Socket factory (defaults to `dgram.createSocket('udp4')`). */
  createSocket?: () => dgram.Socket;
}

// BattlEye passwords are ASCII; DSM stores printable ASCII only (rconPasswordSchema).
const PRINTABLE_ASCII = /^[\x20-\x7e]+$/;

// Held outside the instance so util.inspect / JSON.stringify of a client never shows it.
const passwords = new WeakMap<BattlEyeRconClient, string>();

function osCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : 'UNKNOWN';
}

/**
 * BattlEye RCon v2 client over UDP (DSM-00161: login handshake). The socket is connected, so the
 * OS reports ICMP "port unreachable" as a socket error. The password is kept outside the instance
 * and is never logged or returned.
 */
export class BattlEyeRconClient {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs: number;
  private readonly createSocket: () => dgram.Socket;
  private socket: dgram.Socket | null = null;
  private loggedIn = false;
  private closed = false;

  constructor(options: BattlEyeRconClientOptions) {
    if (!options.host.trim()) {
      throw new RangeError('RCON host must not be empty.');
    }
    if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
      throw new RangeError('RCON port must be an integer between 1 and 65535.');
    }
    if (!PRINTABLE_ASCII.test(options.password)) {
      throw new RangeError('RCON password must be non-empty printable ASCII.');
    }
    this.host = options.host;
    this.port = options.port;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_RCON_TIMEOUT_MS;
    passwords.set(this, options.password);
    this.createSocket = options.createSocket ?? (() => dgram.createSocket('udp4'));
  }

  get isLoggedIn(): boolean {
    return this.loggedIn;
  }

  /** Sends one login request and resolves with the typed outcome. */
  login(): Promise<RconLoginResult> {
    if (this.closed) {
      return Promise.reject(new Error('RCON client is closed.'));
    }
    if (this.loggedIn) {
      return Promise.resolve({ ok: true });
    }
    if (this.socket) {
      return Promise.reject(new Error('RCON login is already in progress.'));
    }

    const socket = this.createSocket();
    this.socket = socket;
    const endpoint = `${this.host}:${this.port}`;

    return new Promise(resolve => {
      let settled = false;
      const finish = (result: RconLoginResult) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        socket.removeListener('message', onMessage);
        if (result.ok) {
          this.loggedIn = true;
        } else {
          this.releaseSocket();
        }
        resolve(result);
      };

      const onMessage = (datagram: Buffer) => {
        const decoded = decodePacket(datagram);
        if (decoded.ok && decoded.packet.type === 'login') {
          finish(
            decoded.packet.success
              ? { ok: true }
              : {
                  ok: false,
                  error: 'login_failed',
                  message: 'BattlEye rejected the RCON password.',
                },
          );
        }
        // Anything else (malformed, unrelated) is ignored while waiting for the login reply.
      };

      const unreachable = (error: unknown) =>
        finish({
          ok: false,
          error: 'unreachable',
          message: `RCON endpoint ${endpoint} is unreachable (${osCode(error)}).`,
        });

      // Keep a permanent error listener: an unhandled 'error' on a socket would crash DSM.
      socket.on('error', error => {
        this.loggedIn = false;
        unreachable(error);
      });
      socket.on('message', onMessage);

      const timer = setTimeout(
        () =>
          finish({
            ok: false,
            error: 'timeout',
            message: `No RCON login response from ${endpoint} within ${this.timeoutMs} ms.`,
          }),
        this.timeoutMs,
      );

      // Node passes a DNS lookup failure to the connect callback (its typings say `() => void`);
      // sending on the unconnected socket would then throw outside this promise.
      const onConnect = (error?: Error | null) => {
        if (error) {
          unreachable(error);
          return;
        }
        socket.send(encodeLoginPacket(passwords.get(this) as string), sendError => {
          if (sendError) {
            unreachable(sendError);
          }
        });
      };
      socket.connect(this.port, this.host, onConnect as () => void);
    });
  }

  /** Releases the socket. Idempotent; the client cannot be reused afterwards. */
  async close(): Promise<void> {
    this.closed = true;
    this.loggedIn = false;
    this.releaseSocket();
  }

  private releaseSocket(): void {
    const socket = this.socket;
    this.socket = null;
    if (!socket) {
      return;
    }
    try {
      socket.close();
    } catch {
      // Already closed (e.g. after an error).
    }
  }
}
