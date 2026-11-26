import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';

import { redactUrl, serializeRequest } from './log-redaction';

describe('redactUrl (DSM-00348)', () => {
  it.each([
    ['/api/v1/realtime/sse?ticket=abc123', '/api/v1/realtime/sse?ticket=[REDACTED]'],
    ['/sse?token=eyJhbGciOi.x.y&lang=en', '/sse?token=[REDACTED]&lang=en'],
    [
      '/x?lang=en&access_token=a&refresh_token=b#frag',
      '/x?lang=en&access_token=[REDACTED]&refresh_token=[REDACTED]#frag',
    ],
    ['/x?TOKEN=abc', '/x?TOKEN=[REDACTED]'],
    ['/x?ticket=', '/x?ticket=[REDACTED]'],
    [
      '/servers/1/config/server-dz?sessionToken=abc&x=1',
      '/servers/1/config/server-dz?sessionToken=[REDACTED]&x=1',
    ],
    ['/x?SESSIONTOKEN=abc', '/x?SESSIONTOKEN=[REDACTED]'],
    ['/x?a=1&sessiontoken=abc#f', '/x?a=1&sessiontoken=[REDACTED]#f'],
    [
      '/x?sessionToken=s&ticket=t&token=u&lang=en',
      '/x?sessionToken=[REDACTED]&ticket=[REDACTED]&token=[REDACTED]&lang=en',
    ],
    ['/x?session%54oken=abc&a=1', '/x?session%54oken=[REDACTED]&a=1'],
    ['/x?%74icket=abc', '/x?%74icket=[REDACTED]'],
    ['/x?tok%65n=abc&a=1', '/x?tok%65n=[REDACTED]&a=1'],
    ['/x?%61ccess_token=abc', '/x?%61ccess_token=[REDACTED]'],
  ])('redacts %s', (url, expected) => {
    expect(redactUrl(url)).toBe(expected);
  });

  it.each([
    '/x?my%73essionToken=1',
    '/x?a=%74icket',
    '/x?%E0%A4%A=1',
    '/x?%=1&b=%',
    '/x?tok%zzen=1',
  ])('leaves %s alone and does not throw', url => {
    expect(redactUrl(url)).toBe(url);
  });

  it.each(['/api/v1/servers', '/x?tokens=1', '/x?myticket=1', '/x?a=token', '/x?mysessionToken=1'])(
    'leaves %s alone',
    url => {
      expect(redactUrl(url)).toBe(url);
    },
  );
});

describe('serializeRequest', () => {
  it("keeps Fastify's default request fields with a redacted URL", () => {
    const request = {
      method: 'GET',
      url: '/api/v1/realtime/sse?ticket=secret',
      host: 'localhost:5000',
      ip: '127.0.0.1',
      socket: { remotePort: 51234 },
    } as unknown as FastifyRequest;

    expect(serializeRequest(request)).toEqual({
      method: 'GET',
      url: '/api/v1/realtime/sse?ticket=[REDACTED]',
      host: 'localhost:5000',
      remoteAddress: '127.0.0.1',
      remotePort: 51234,
    });
  });

  it('tolerates a request without a socket', () => {
    const request = { method: 'GET', url: '/', host: 'h', ip: '::1' } as unknown as FastifyRequest;
    expect(serializeRequest(request).remotePort).toBeUndefined();
  });
});
