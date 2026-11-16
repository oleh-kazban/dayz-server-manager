import dgram from 'node:dgram';

import {
  decodePacket,
  encodeCommandPacket,
  encodeLoginPacket,
  MAX_SEQUENCE,
  parseCommandResponse,
} from './packet';

export const DEFAULT_RCON_TIMEOUT_MS = 5_000;
/** Wait per command attempt before the same packet is sent again. */
export const DEFAULT_COMMAND_ATTEMPT_TIMEOUT_MS = 2_000;
/** Resends after the first attempt (3 attempts in total by default). */
export const DEFAULT_COMMAND_RETRIES = 2;

export type RconLoginError = 'login_failed' | 'timeout' | 'unreachable';

/** Network outcomes are values, not exceptions. Messages never contain the password. */
export type RconLoginResult = { ok: true } | { ok: false; error: RconLoginError; message: string };

export type RconCommandError = 'not_logged_in' | 'timeout' | 'connection_lost' | 'busy';

/** The complete response text (multi-part responses already reassembled), or a typed failure. */
export type RconCommandResult =
  { ok: true; response: string } | { ok: false; error: RconCommandError; message: string };

export interface BattlEyeRconClientOptions {
  host: string;
  port: number;
  password: string;
  /** How long to wait for the login response. */
  timeoutMs?: number;
  /** Socket factory (defaults to `dgram.createSocket('udp4')`). */
  createSocket?: () => dgram.Socket;
  /** How long to wait for a command response before resending the same packet. */
  commandAttemptTimeoutMs?: number;
  /** How many times an unanswered command is resent before it fails with `timeout`. */
  commandRetries?: number;
}

interface PendingCommand {
  packet: Buffer;
  attempts: number;
  timer: ReturnType<typeof setTimeout>;
  /**
   * Received parts of a multi-part response, grouped by the announced part count so a stray part
   * with a different count can never block the genuine set.
   */
  partsByTotal: Map<number, (Buffer | undefined)[]>;
  resolve: (result: RconCommandResult) => void;
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
 * BattlEye RCon v2 client over UDP: login handshake (DSM-00161) and commands with sequence
 * numbers, bounded retries and multi-part reassembly (DSM-00165). The socket is connected, so the
 * OS reports ICMP "port unreachable" as a socket error. The password is kept outside the instance
 * and is never logged or returned.
 */
export class BattlEyeRconClient {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs: number;
  readonly commandAttemptTimeoutMs: number;
  readonly commandRetries: number;
  private readonly createSocket: () => dgram.Socket;
  private readonly pending = new Map<number, PendingCommand>();
  private nextSequence = 0;
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
    this.commandAttemptTimeoutMs =
      options.commandAttemptTimeoutMs ?? DEFAULT_COMMAND_ATTEMPT_TIMEOUT_MS;
    this.commandRetries = options.commandRetries ?? DEFAULT_COMMAND_RETRIES;
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
          socket.on('message', datagram => this.onSessionMessage(datagram));
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
        this.failAll(
          'connection_lost',
          `RCON connection to ${endpoint} was lost (${osCode(error)}).`,
        );
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

  /**
   * Sends a command and resolves with its complete response. An unanswered command is resent with
   * the same sequence number up to `commandRetries` times; BattlEye answers a resend again.
   */
  command(command: string): Promise<RconCommandResult> {
    const socket = this.socket;
    if (!this.loggedIn || !socket) {
      return Promise.resolve({
        ok: false,
        error: 'not_logged_in',
        message: 'RCON command sent before a successful login.',
      });
    }
    const sequence = this.allocateSequence();
    if (sequence === null) {
      return Promise.resolve({
        ok: false,
        error: 'busy',
        message: 'All 256 RCON sequence numbers are waiting for a response.',
      });
    }

    return new Promise(resolve => {
      const packet = encodeCommandPacket(sequence, command);
      const entry: PendingCommand = {
        packet,
        attempts: 1,
        timer: this.armAttemptTimer(sequence),
        partsByTotal: new Map(),
        resolve,
      };
      this.pending.set(sequence, entry);
      socket.send(packet);
    });
  }

  /** Releases the socket and fails pending commands. Idempotent; the client cannot be reused. */
  async close(): Promise<void> {
    this.closed = true;
    this.loggedIn = false;
    this.failAll('connection_lost', 'RCON client was closed.');
    this.releaseSocket();
  }

  /** Number of commands waiting for a response (diagnostics and tests). */
  get pendingCommands(): number {
    return this.pending.size;
  }

  /** Next sequence number not in use, wrapping 255 → 0; `null` when all are in flight. */
  private allocateSequence(): number | null {
    for (let offset = 0; offset <= MAX_SEQUENCE; offset++) {
      const sequence = (this.nextSequence + offset) % (MAX_SEQUENCE + 1);
      if (!this.pending.has(sequence)) {
        this.nextSequence = (sequence + 1) % (MAX_SEQUENCE + 1);
        return sequence;
      }
    }
    return null;
  }

  private armAttemptTimer(sequence: number): ReturnType<typeof setTimeout> {
    return setTimeout(() => this.onAttemptTimeout(sequence), this.commandAttemptTimeoutMs);
  }

  private onAttemptTimeout(sequence: number): void {
    // Timers are cleared whenever an entry settles, and close() / socket errors settle every entry
    // before the socket goes away, so a firing timer always has its entry and an open socket.
    const entry = this.pending.get(sequence) as PendingCommand;
    const socket = this.socket as dgram.Socket;
    if (entry.attempts > this.commandRetries) {
      this.settle(sequence, {
        ok: false,
        error: 'timeout',
        message: `No complete RCON response after ${entry.attempts} attempts of ${this.commandAttemptTimeoutMs} ms.`,
      });
      return;
    }
    entry.attempts += 1;
    entry.timer = this.armAttemptTimer(sequence);
    socket.send(entry.packet);
  }

  /** Routes datagrams received after login. Malformed and unrelated packets are ignored. */
  private onSessionMessage(datagram: Buffer): void {
    const decoded = decodePacket(datagram);
    if (!decoded.ok || decoded.packet.type !== 'command') {
      return;
    }
    const { sequence, data } = decoded.packet;
    const entry = this.pending.get(sequence);
    if (!entry) {
      return; // Late duplicate of an already completed command.
    }

    const body = parseCommandResponse(data);
    if (body.kind === 'invalid') {
      return;
    }
    if (body.kind === 'single') {
      this.settle(sequence, { ok: true, response: body.data.toString('utf8') });
      return;
    }

    let parts = entry.partsByTotal.get(body.total);
    if (!parts) {
      parts = new Array<Buffer | undefined>(body.total).fill(undefined);
      entry.partsByTotal.set(body.total, parts);
    }
    // Resends deliver the same parts again; keeping the latest copy is harmless.
    parts[body.index] = body.data;
    if (parts.every(part => part !== undefined)) {
      this.settle(sequence, {
        ok: true,
        response: Buffer.concat(parts as Buffer[]).toString('utf8'),
      });
    }
  }

  /** Callers only settle sequences they just found in `pending`. */
  private settle(sequence: number, result: RconCommandResult): void {
    const entry = this.pending.get(sequence) as PendingCommand;
    clearTimeout(entry.timer);
    this.pending.delete(sequence);
    entry.resolve(result);
  }

  private failAll(error: RconCommandError, message: string): void {
    for (const sequence of [...this.pending.keys()]) {
      this.settle(sequence, { ok: false, error, message });
    }
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
