import dgram from 'node:dgram';

import { decodePacket, encodePacket, PACKET_TYPE } from '../packet';

export interface FakeBattlEyeServerOptions {
  password: string;
  /** Never answer (to exercise timeouts). */
  silent?: boolean;
  /** Datagrams sent before the real login answer (malformed or unrelated packets). */
  noiseBeforeAnswer?: Buffer[];
}

/**
 * In-process BattlEye RCON server on 127.0.0.1 for tests. Answers login requests like BattlEye:
 * `0x00 0x01` for the right password, `0x00 0x00` otherwise.
 */
export class FakeBattlEyeServer {
  readonly received: Buffer[] = [];
  private readonly socket = dgram.createSocket('udp4');

  private constructor(private readonly options: FakeBattlEyeServerOptions) {}

  static async start(options: FakeBattlEyeServerOptions): Promise<FakeBattlEyeServer> {
    const server = new FakeBattlEyeServer(options);
    await new Promise<void>(resolve => server.socket.bind(0, '127.0.0.1', resolve));
    server.socket.on('message', (datagram, remote) => server.handle(datagram, remote));
    return server;
  }

  get port(): number {
    return this.socket.address().port;
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
    if (!decoded.ok || decoded.packet.type !== 'login') {
      return;
    }
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
}
