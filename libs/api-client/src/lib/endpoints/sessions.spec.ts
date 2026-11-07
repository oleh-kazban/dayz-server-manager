import { describe, expect, it, vi } from 'vitest';

import { revokeOthersResponseSchema, sessionListResponseSchema } from '@dsm/api-contracts';

import type { HttpClient } from '../http-client';

import { createSessionsEndpoint } from './sessions';

describe('Sessions Endpoint Client', () => {
  const mockHttpClient: HttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  const endpoint = createSessionsEndpoint(mockHttpClient);

  it('calls client.get for sessions list', async () => {
    const mockSessions = { sessions: [], totalCount: 0 };
    vi.mocked(mockHttpClient.get).mockResolvedValueOnce(mockSessions);

    const result = await endpoint.list();
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      '/api/v1/auth/sessions',
      sessionListResponseSchema,
    );
    expect(result).toEqual(mockSessions);
  });

  it('calls client.delete for revoking single session', async () => {
    const mockResponse = { success: true, message: 'Revoked' };
    vi.mocked(mockHttpClient.delete).mockResolvedValueOnce(mockResponse);

    const result = await endpoint.revoke('sess-to-terminate');
    expect(mockHttpClient.delete).toHaveBeenCalledWith(
      '/api/v1/auth/sessions/sess-to-terminate',
      expect.anything(),
    );
    expect(result).toEqual(mockResponse);
  });

  it('calls client.post for bulk revoking other sessions', async () => {
    const mockResponse = { revokedCount: 3, message: 'Revoked 3' };
    vi.mocked(mockHttpClient.post).mockResolvedValueOnce(mockResponse);

    const result = await endpoint.revokeOthers();
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/api/v1/auth/sessions/revoke-others',
      revokeOthersResponseSchema,
    );
    expect(result).toEqual(mockResponse);
  });
});
