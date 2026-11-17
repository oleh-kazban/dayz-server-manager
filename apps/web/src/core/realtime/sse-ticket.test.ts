import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@aegis/api-client';

import { requestSseTicket } from './sse-ticket';

describe('requestSseTicket (DSM-00348)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a fresh ticket while signed in', async () => {
    vi.spyOn(apiClient.client, 'getToken').mockReturnValue('jwt');
    vi.spyOn(apiClient.realtime, 'createTicket').mockResolvedValue({
      ticket: 't'.repeat(43),
      expiresAt: '2026-11-17T10:00:30.000Z',
    });
    await expect(requestSseTicket()).resolves.toBe('t'.repeat(43));
  });

  it('returns null without asking while signed out', async () => {
    vi.spyOn(apiClient.client, 'getToken').mockReturnValue(null);
    const createTicket = vi.spyOn(apiClient.realtime, 'createTicket');
    await expect(requestSseTicket()).resolves.toBeNull();
    expect(createTicket).not.toHaveBeenCalled();
  });

  it('returns null when the request fails, so the caller retries', async () => {
    vi.spyOn(apiClient.client, 'getToken').mockReturnValue('jwt');
    vi.spyOn(apiClient.realtime, 'createTicket').mockRejectedValue(new Error('offline'));
    await expect(requestSseTicket()).resolves.toBeNull();
  });
});
