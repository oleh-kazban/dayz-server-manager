import { crc32 } from './crc32';

/** BattlEye RCon v2 packet types (the byte after `0xFF`). */
export const PACKET_TYPE = {
  LOGIN: 0x00,
  COMMAND: 0x01,
  MESSAGE: 0x02,
} as const;
export type PacketType = (typeof PACKET_TYPE)[keyof typeof PACKET_TYPE];

const HEADER = Buffer.from('BE', 'ascii');
const SEPARATOR = 0xff;
/** `B` `E` + 4-byte CRC32 + `0xFF` + type byte. */
const MIN_PACKET_LENGTH = 8;
const CHECKSUM_OFFSET = 2;
const BODY_OFFSET = 6;

export type DecodedPacket =
  | { type: 'login'; success: boolean }
  | { type: 'command'; sequence: number; data: Buffer }
  | { type: 'message'; sequence: number; text: string };

export type PacketDecodeError = 'TOO_SHORT' | 'BAD_HEADER' | 'BAD_CHECKSUM' | 'UNKNOWN_TYPE';

export type PacketDecodeResult =
  { ok: true; packet: DecodedPacket } | { ok: false; error: PacketDecodeError };

/** Frames `type` + `payload` as `BE` + CRC32 (little-endian) + `0xFF` + type + payload. */
export function encodePacket(type: PacketType, payload: Uint8Array = Buffer.alloc(0)): Buffer {
  const body = Buffer.concat([Buffer.from([SEPARATOR, type]), payload]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32LE(crc32(body));
  return Buffer.concat([HEADER, checksum, body]);
}

/** Login request: type `0x00` followed by the password bytes (ASCII). */
export function encodeLoginPacket(password: string): Buffer {
  return encodePacket(PACKET_TYPE.LOGIN, Buffer.from(password, 'ascii'));
}

/** Decodes one datagram. Never throws: every byte comes from the network. */
export function decodePacket(datagram: Uint8Array): PacketDecodeResult {
  const buffer = Buffer.from(datagram.buffer, datagram.byteOffset, datagram.byteLength);
  if (buffer.length < MIN_PACKET_LENGTH) {
    return { ok: false, error: 'TOO_SHORT' };
  }
  if (!buffer.subarray(0, CHECKSUM_OFFSET).equals(HEADER) || buffer[BODY_OFFSET] !== SEPARATOR) {
    return { ok: false, error: 'BAD_HEADER' };
  }
  const body = buffer.subarray(BODY_OFFSET);
  if (buffer.readUInt32LE(CHECKSUM_OFFSET) !== crc32(body)) {
    return { ok: false, error: 'BAD_CHECKSUM' };
  }

  const type = body[1];
  if (type !== PACKET_TYPE.LOGIN && type !== PACKET_TYPE.COMMAND && type !== PACKET_TYPE.MESSAGE) {
    return { ok: false, error: 'UNKNOWN_TYPE' };
  }
  // Every known type carries at least one byte: the login result or a sequence number.
  const payload = body.subarray(2);
  if (payload.length < 1) {
    return { ok: false, error: 'TOO_SHORT' };
  }

  if (type === PACKET_TYPE.LOGIN) {
    return { ok: true, packet: { type: 'login', success: payload[0] === 0x01 } };
  }
  if (type === PACKET_TYPE.COMMAND) {
    return {
      ok: true,
      packet: { type: 'command', sequence: payload[0], data: payload.subarray(1) },
    };
  }
  return {
    ok: true,
    packet: { type: 'message', sequence: payload[0], text: payload.subarray(1).toString('utf8') },
  };
}
