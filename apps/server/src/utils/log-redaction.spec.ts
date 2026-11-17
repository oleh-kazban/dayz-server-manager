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
  ])('redacts %s', (url, expected) => {
    expect(redactUrl(url)).toBe(expected);
  });

  it.each(['/api/v1/servers', '/x?tokens=1', '/x?myticket=1', '/x?a=token'])(
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
