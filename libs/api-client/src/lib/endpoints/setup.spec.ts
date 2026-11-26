import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupRootResponseSchema } from '@aegis/api-contracts';

import { HttpClient } from '../http-client';

import { createSetupEndpoint } from './setup';

const request = {
  username: 'owner',
  password: 'Str0ng!Pass1',
  confirmPassword: 'Str0ng!Pass1',
};

const response = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  expiresIn: 900,
  user: { id: '11111111-2222-3333-4444-555555555555', username: 'owner', role: 'root' },
};

describe('Setup Endpoint Client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('setupRoot posts the dto to /api/v1/setup/root with the sign-in response schema', async () => {
    const mockHttpClient: HttpClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValueOnce(response),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const result = await createSetupEndpoint(mockHttpClient).setupRoot(request);

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/api/v1/setup/root',
      setupRootResponseSchema,
      request,
    );
    expect(result).toEqual(response);
  });

  describe('over HTTP', () => {
    let setup: ReturnType<typeof createSetupEndpoint>;

    beforeEach(() => {
      setup = createSetupEndpoint(new HttpClient({ baseUrl: 'https://test-server' }));
    });

    it('setupRoot sends a POST with the JSON body and returns the parsed sign-in response', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(response), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      const result = await setup.setupRoot(request);

      expect(result).toEqual(response);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://test-server/api/v1/setup/root',
        expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }),
      );
    });

    it('setupRoot rejects a response that is not a sign-in response', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ accessToken: 'only-a-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      await expect(setup.setupRoot(request)).rejects.toThrow('Response schema validation failed');
    });
  });
});
