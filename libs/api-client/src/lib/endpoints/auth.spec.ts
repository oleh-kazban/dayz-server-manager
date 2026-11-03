import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpClient } from '../http-client';

import { createAuthEndpoint } from './auth';

describe('Auth Endpoint', () => {
  let client: HttpClient;
  let auth: ReturnType<typeof createAuthEndpoint>;

  beforeEach(() => {
    client = new HttpClient({ baseUrl: 'https://test-server' });
    auth = createAuthEndpoint(client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('login sends credentials and returns parsed response', async () => {
    const mockResponse = {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      expiresIn: 900,
      user: {
        id: '11111111-2222-3333-4444-555555555555',
        username: 'admin',
        role: 'admin',
      },
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await auth.login({
      usernameOrEmail: 'admin',
      password: 'password',
    });

    expect(result).toEqual(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://test-server/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          usernameOrEmail: 'admin',
          password: 'password',
        }),
      }),
    );
  });

  it('refresh sends refresh token and returns new access token', async () => {
    const mockResponse = {
      accessToken: 'new-access-token',
      expiresIn: 900,
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await auth.refresh({ refreshToken: 'existing-refresh-token' });

    expect(result).toEqual(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://test-server/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'existing-refresh-token' }),
      }),
    );
  });

  it('me queries current authenticated user', async () => {
    const mockUser = {
      id: '11111111-2222-3333-4444-555555555555',
      username: 'admin',
      role: 'admin',
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockUser), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    client.setToken('valid-bearer-token');
    expect(client.getToken()).toBe('valid-bearer-token');

    const result = await auth.me();

    expect(result).toEqual(mockUser);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://test-server/api/v1/auth/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-bearer-token',
        }),
      }),
    );

    client.setToken(null);
    expect(client.getToken()).toBeNull();
  });
});
