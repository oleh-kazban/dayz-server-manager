import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpClient } from '../http-client';

import { createRealtimeEndpoint } from './realtime';

describe('Realtime Endpoint (DSM-00348)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts for a ticket with the Authorization header and parses it', async () => {
    const client = new HttpClient({ baseUrl: 'https://test-server' });
    client.setToken('access-jwt');
    const body = { ticket: 'a'.repeat(43), expiresAt: '2026-11-17T18:00:30.000Z' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(createRealtimeEndpoint(client).createTicket()).resolves.toEqual(body);
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe('https://test-server/api/v1/realtime/ticket');
    expect(init).toMatchObject({ method: 'POST' });
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer access-jwt');
  });
});
