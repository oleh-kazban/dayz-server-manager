import { isIP } from 'node:net';

const EXAMPLE = '(for example 127.0.0.1 or 10.0.0.0/8)';
const GENERIC = `TRUST_PROXY must be false, true, or a comma-separated list of IP addresses or CIDR ranges ${EXAMPLE}`;
const HOP_COUNT = `TRUST_PROXY does not accept a hop count; list the address or CIDR range of the proxy instead ${EXAMPLE}`;
const KEYWORDS = new Set(['loopback', 'linklocal', 'uniquelocal']);

function isValidEntry(entry: string): boolean {
  if (KEYWORDS.has(entry)) return true;
  const parts = entry.split('/');
  if (parts.length > 2) return false;
  const version = isIP(parts[0]);
  if (version === 0) return false;
  if (parts.length === 1) return true;
  if (!/^\d+$/.test(parts[1])) return false;
  const prefix = Number(parts[1]);
  return prefix >= 1 && prefix <= (version === 4 ? 32 : 128);
}

/**
 * Reads TRUST_PROXY: `false` (off), `true`, or a normalised comma list of addresses, CIDR ranges
 * and proxy-addr keywords. Throws with a message naming the variable.
 */
export function parseTrustProxy(raw: string | undefined): boolean | string {
  const value = (raw ?? '').trim();
  const lower = value.toLowerCase();
  if (value === '' || lower === 'false') return false;
  if (lower === 'true') return true;
  if (/^\d+$/.test(value)) throw new Error(HOP_COUNT);
  const entries = value.split(',').map(entry => entry.trim());
  if (!entries.every(isValidEntry)) throw new Error(GENERIC);
  return entries.join(',');
}
