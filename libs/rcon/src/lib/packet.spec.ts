import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { crc32 } from './crc32';
import { decodePacket, encodeLoginPacket, encodePacket, PACKET_TYPE } from './packet';

/** Builds a packet by hand (independent of encodePacket) with a correct or forged checksum. */
function rawPacket(body: number[], checksum?: number): Buffer {
  const bodyBuffer = Buffer.from(body);
  const crc = Buffer.alloc(4);
  crc.writeUInt32LE(checksum ?? zlib.crc32(bodyBuffer));
  return Buffer.concat([Buffer.from('BE', 'ascii'), crc, bodyBuffer]);
}

describe('crc32', () => {
  it('matches the IEEE reference values and zlib.crc32', () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
    expect(crc32(Buffer.from('123456789', 'ascii'))).toBe(0xcbf43926);
    for (const sample of ['', 'a', 'BattlEye', 'ÿ\u0000login', 'x'.repeat(1_000)]) {
      const bytes = Buffer.from(sample, 'latin1');
      expect(crc32(bytes)).toBe(zlib.crc32(bytes));
    }
  });
});

describe('encodePacket', () => {
  it('frames BE + little-endian CRC32 of the body + 0xFF + type + payload', () => {
    const packet = encodeLoginPacket('s3cret');
    const body = Buffer.concat([Buffer.from([0xff, 0x00]), Buffer.from('s3cret', 'ascii')]);
    expect(packet.subarray(0, 2).toString('ascii')).toBe('BE');
    expect(packet.readUInt32LE(2)).toBe(zlib.crc32(body));
    expect(packet.subarray(6)).toEqual(body);
    expect(packet).toEqual(rawPacket([...body]));
  });

  it('defaults to an empty payload', () => {
    expect(encodePacket(PACKET_TYPE.COMMAND)).toEqual(rawPacket([0xff, 0x01]));
  });
});

describe('decodePacket', () => {
  it('decodes login responses', () => {
    expect(decodePacket(rawPacket([0xff, 0x00, 0x01]))).toEqual({
      ok: true,
      packet: { type: 'login', success: true },
    });
    expect(decodePacket(rawPacket([0xff, 0x00, 0x00]))).toEqual({
      ok: true,
      packet: { type: 'login', success: false },
    });
  });

  it('decodes command responses and server messages', () => {
    const command = decodePacket(rawPacket([0xff, 0x01, 0x07, ...Buffer.from('ok')]));
    expect(command).toEqual({
      ok: true,
      packet: { type: 'command', sequence: 7, data: Buffer.from('ok') },
    });
    expect(
      decodePacket(rawPacket([0xff, 0x02, 0xfe, ...Buffer.from('Player connected', 'utf8')])),
    ).toEqual({
      ok: true,
      packet: { type: 'message', sequence: 254, text: 'Player connected' },
    });
  });

  it('round-trips encodePacket output and accepts any Uint8Array view', () => {
    const packet = encodePacket(PACKET_TYPE.MESSAGE, Buffer.from([3, ...Buffer.from('hi')]));
    const view = new Uint8Array(Buffer.concat([Buffer.from([9, 9]), packet])).subarray(2);
    expect(decodePacket(view)).toEqual({
      ok: true,
      packet: { type: 'message', sequence: 3, text: 'hi' },
    });
  });

  it.each([
    ['too short overall', Buffer.from('BE\u0000\u0000', 'latin1'), 'TOO_SHORT'],
    [
      'wrong magic',
      Buffer.concat([Buffer.from('XX'), rawPacket([0xff, 0x00, 0x01]).subarray(2)]),
      'BAD_HEADER',
    ],
    ['missing 0xFF separator', rawPacket([0xfe, 0x00, 0x01]), 'BAD_HEADER'],
    ['checksum mismatch', rawPacket([0xff, 0x00, 0x01], 0x12345678), 'BAD_CHECKSUM'],
    ['unknown type', rawPacket([0xff, 0x09, 0x01]), 'UNKNOWN_TYPE'],
    ['login without result byte', rawPacket([0xff, 0x00]), 'TOO_SHORT'],
    ['command without sequence', rawPacket([0xff, 0x01]), 'TOO_SHORT'],
    ['message without sequence', rawPacket([0xff, 0x02]), 'TOO_SHORT'],
  ])('rejects %s without throwing', (_name, datagram, error) => {
    expect(decodePacket(datagram)).toEqual({ ok: false, error });
  });
});
