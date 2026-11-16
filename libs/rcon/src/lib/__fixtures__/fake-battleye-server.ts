import dgram from 'node:dgram';

import { decodePacket, encodePacket, PACKET_TYPE } from '../packet';

export interface FakeBattlEyeServerOptions {
  password: string;
  /** Never answer (to exercise timeouts). */
  silent?: boolean;
  /** Datagrams sent before the real login answer (malformed or unrelated packets). */
  noiseBeforeAnswer?: Buffer[];
  /** Command handler; returns the response text (default: empty response). */
  respond?: (command: string) => string;
  /** Split responses longer than this many bytes into BattlEye multi-part packets. */
  partSize?: number;
  /** Send multi-part responses last part first. */
  reverseParts?: boolean;
  /** Ignore this many command packets before answering (simulates packet loss). */
  dropCommands?: number;
  /** Datagrams sent before each command answer (malformed or unrelated packets). */
  noiseBeforeCommandAnswer?: (sequence: number) => Buffer[];
}

export interface ReceivedCommand {
  sequence: number;
  command: string;
}

/**
 * In-process BattlEye RCON server on 127.0.0.1 for tests. Answers login requests like BattlEye
 * (`0x00 0x01` for the right password, `0x00 0x00` otherwise) and commands with the same sequence
 * number, splitting long responses into `0x00 <total> <index>` parts.
 */
export class FakeBattlEyeServer {
  readonly received: Buffer[] = [];
  readonly commands: ReceivedCommand[] = [];
  private readonly socket = dgram.createSocket('udp4');
  private dropsLeft: number;

  private constructor(private readonly options: FakeBattlEyeServerOptions) {
    this.dropsLeft = options.dropCommands ?? 0;
  }

  static async start(options: FakeBattlEyeServerOptions): Promise<FakeBattlEyeServer> {
    const server = new FakeBattlEyeServer(options);
    await new Promise<void>(resolve => server.socket.bind(0, '127.0.0.1', resolve));
    server.socket.on('message', (datagram, remote) => server.handle(datagram, remote));
    return server;
  }

  get port(): number {
    return this.socket.address().port;
  }

  /** Sends a raw datagram to a client (e.g. unsolicited or forged packets). */
  sendTo(datagram: Buffer, port: number): void {
    this.socket.send(datagram, port, '127.0.0.1');
  }

  close(): Promise<void> {
    return new Promise(resolve => this.socket.close(() => resolve()));
  }

  private handle(datagram: Buffer, remote: dgram.RemoteInfo): void {
    this.received.push(datagram);
    if (this.options.silent) {
      return;
    }
    const decoded = decodePacket(datagram);
    if (!decoded.ok) {
      return;
    }
    if (decoded.packet.type === 'login') {
      this.answerLogin(datagram, remote);
    } else if (decoded.packet.type === 'command') {
      this.answerCommand(decoded.packet.sequence, decoded.packet.data.toString('utf8'), remote);
    }
  }

  private answerLogin(datagram: Buffer, remote: dgram.RemoteInfo): void {
    const password = datagram.subarray(8).toString('ascii');
    for (const noise of this.options.noiseBeforeAnswer ?? []) {
      this.socket.send(noise, remote.port, remote.address);
    }
    const accepted = password === this.options.password ? 0x01 : 0x00;
    this.socket.send(
      encodePacket(PACKET_TYPE.LOGIN, Buffer.from([accepted])),
      remote.port,
      remote.address,
    );
  }

  private answerCommand(sequence: number, command: string, remote: dgram.RemoteInfo): void {
    this.commands.push({ sequence, command });
    if (this.dropsLeft > 0) {
      this.dropsLeft -= 1;
      return;
    }
    for (const noise of this.options.noiseBeforeCommandAnswer?.(sequence) ?? []) {
      this.socket.send(noise, remote.port, remote.address);
    }

    const text = Buffer.from(this.options.respond?.(command) ?? '', 'utf8');
    const partSize = this.options.partSize;
    if (!partSize || text.length <= partSize) {
      this.send(Buffer.concat([Buffer.from([sequence]), text]), remote);
      return;
    }

    const chunks: Buffer[] = [];
    for (let offset = 0; offset < text.length; offset += partSize) {
      chunks.push(text.subarray(offset, offset + partSize));
    }
    const parts = chunks.map((chunk, index) =>
      Buffer.concat([Buffer.from([sequence, 0x00, chunks.length, index]), chunk]),
    );
    for (const part of this.options.reverseParts ? parts.reverse() : parts) {
      this.send(part, remote);
    }
  }

  private send(payload: Buffer, remote: dgram.RemoteInfo): void {
    this.socket.send(encodePacket(PACKET_TYPE.COMMAND, payload), remote.port, remote.address);
  }
}
