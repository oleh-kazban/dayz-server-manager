import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';

import { signInContext } from './sign-in';

const FIRST = '203.0.113.7';
const SECOND = '198.51.100.2';
const DIRECT = '192.0.2.9';

const fakeRequest = (headers: Record<string, unknown>, ip?: string) =>
  ({ headers, ip }) as unknown as FastifyRequest;

describe('signInContext client address', () => {
  it('uses the first element of an array x-forwarded-for', () => {
    const ctx = signInContext(fakeRequest({ 'x-forwarded-for': [FIRST, SECOND] }, DIRECT), false);

    expect(ctx.ipAddress).toBe(FIRST);
  });

  it('uses the first trimmed entry of a comma list', () => {
    const ctx = signInContext(
      fakeRequest({ 'x-forwarded-for': ` ${FIRST} , ${SECOND}` }, DIRECT),
      false,
    );

    expect(ctx.ipAddress).toBe(FIRST);
  });

  it('falls back to the request ip without the header', () => {
    expect(signInContext(fakeRequest({}, DIRECT), false).ipAddress).toBe(DIRECT);
  });

  it('falls back to 127.0.0.1 without header and ip', () => {
    expect(signInContext(fakeRequest({}), false).ipAddress).toBe('127.0.0.1');
  });

  it('passes rememberMe and the user agent through', () => {
    const ctx = signInContext(fakeRequest({ 'user-agent': 'agent/1' }, DIRECT), true);

    expect(ctx.rememberMe).toBe(true);
    expect(ctx.userAgent).toBe('agent/1');
  });
});
