import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, HttpClient, ValidationError } from '../http-client';

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
      refreshToken: 'new-refresh-token',
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

  it('refresh rejects a response without the rotated refresh token (AC-4)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ accessToken: 'new-access-token', expiresIn: 900 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(auth.refresh({ refreshToken: 'existing-refresh-token' })).rejects.toThrow(
      ValidationError,
    );
  });

  describe('logout', () => {
    it('posts to the sign-out route without a body and resolves on 204 (AC-3)', async () => {
      client.setToken('valid-bearer-token');
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

      await expect(auth.logout()).resolves.toBeUndefined();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://test-server/api/v1/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer valid-bearer-token' }),
        }),
      );
    });

    it('aborts the call after 5 seconds so a hanging server never blocks sign-out (AC-3)', async () => {
      const controller = new AbortController();
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

      await auth.logout();

      expect(timeoutSpy).toHaveBeenCalledWith(5000);
      const init = vi.mocked(globalThis.fetch).mock.calls[0][1];
      expect(init?.signal).toBe(controller.signal);
    });

    it('rejects with the status of a failed call', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'Token expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(auth.logout()).rejects.toBeInstanceOf(ApiError);
    });
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
