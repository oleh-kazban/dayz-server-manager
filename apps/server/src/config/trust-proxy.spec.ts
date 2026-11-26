/* eslint-disable sonarjs/no-hardcoded-ip -- address literals are test data */
import { describe, expect, it } from 'vitest';

import { parseTrustProxy } from './trust-proxy';

const GENERIC =
  'TRUST_PROXY must be false, true, or a comma-separated list of IP addresses or CIDR ranges (for example 127.0.0.1 or 10.0.0.0/8)';
const HOP_COUNT =
  'TRUST_PROXY does not accept a hop count; list the address or CIDR range of the proxy instead (for example 127.0.0.1 or 10.0.0.0/8)';

describe('parseTrustProxy (AC-12)', () => {
  describe('off', () => {
    it.each([undefined, '', '   ', 'false', 'FALSE', ' False '])('returns false for %j', raw => {
      expect(parseTrustProxy(raw)).toBe(false);
    });
  });

  describe('true', () => {
    it.each(['true', 'TRUE', ' True '])('returns true for %j', raw => {
      expect(parseTrustProxy(raw)).toBe(true);
    });
  });

  describe('address lists', () => {
    it.each([
      ['127.0.0.1', '127.0.0.1'],
      ['::1', '::1'],
      ['10.0.0.0/8', '10.0.0.0/8'],
      ['10.0.0.0/1', '10.0.0.0/1'],
      ['10.0.0.1/32', '10.0.0.1/32'],
      ['fc00::/7', 'fc00::/7'],
      ['2001:db8::/32', '2001:db8::/32'],
      ['2001:db8::1/128', '2001:db8::1/128'],
      ['::1/1', '::1/1'],
      ['10.0.0.0/8,::1', '10.0.0.0/8,::1'],
      [' 10.0.0.0/8 , ::1 ', '10.0.0.0/8,::1'],
      ['loopback', 'loopback'],
      ['linklocal', 'linklocal'],
      ['uniquelocal', 'uniquelocal'],
      ['loopback, 10.0.0.0/8', 'loopback,10.0.0.0/8'],
    ])('accepts %j and returns %j', (raw, expected) => {
      expect(parseTrustProxy(raw)).toBe(expected);
    });
  });

  describe('rejected values name TRUST_PROXY', () => {
    it.each([
      '1.2.3',
      '1.2.3.256',
      '10.0.0.0/0',
      '10.0.0.0/33',
      '::1/0',
      '::1/129',
      '10.0.0.0/',
      '10.0.0.0/x',
      '10.0.0.0/8/8',
      '/8',
      'a,,b',
      ',',
      '127.0.0.1,',
      ',127.0.0.1',
      'yes',
      'no',
      'on',
      '1.5',
      'example.com',
      'true,127.0.0.1',
      'false,127.0.0.1',
    ])('throws the address-list message for %j', raw => {
      expect(() => parseTrustProxy(raw)).toThrow(new Error(GENERIC));
    });

    it.each(['0', '1', '2', '16', ' 3 '])(
      'throws the hop-count message for the bare integer %j',
      raw => {
        expect(() => parseTrustProxy(raw)).toThrow(new Error(HOP_COUNT));
      },
    );

    it('mentions the variable and the hop count in the bare integer message', () => {
      expect(() => parseTrustProxy('2')).toThrow(/TRUST_PROXY/);
      expect(() => parseTrustProxy('2')).toThrow(/hop count/);
    });

    it.each(['-1', '+2'])('rejects the signed number %j with a message naming TRUST_PROXY', raw => {
      expect(() => parseTrustProxy(raw)).toThrow(/TRUST_PROXY/);
    });
  });
});
