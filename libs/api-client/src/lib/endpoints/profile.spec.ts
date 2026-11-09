import { describe, expect, it, vi } from 'vitest';

import { changePasswordResponseSchema, userProfileSchema } from '@aegis/api-contracts';

import type { HttpClient } from '../http-client';

import { createProfileEndpoint } from './profile';

describe('Profile Endpoint Client', () => {
  const mockHttpClient: HttpClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  const endpoint = createProfileEndpoint(mockHttpClient);

  it('calls client.get for profile', async () => {
    const mockProfile = {
      id: 'u1',
      username: 'admin',
      role: 'admin' as const,
      timezone: 'UTC',
      timeFormat: '24h' as const,
      createdAt: '2026-11-01T00:00:00.000Z',
    };
    vi.mocked(mockHttpClient.get).mockResolvedValueOnce(mockProfile);

    const result = await endpoint.get();
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/profile', userProfileSchema);
    expect(result).toEqual(mockProfile);
  });

  it('calls client.patch for profile update', async () => {
    const patchPayload = { displayName: 'Lead Operator' };
    const mockProfile = {
      id: 'u1',
      username: 'admin',
      displayName: 'Lead Operator',
      role: 'admin' as const,
      timezone: 'UTC',
      timeFormat: '24h' as const,
      createdAt: '2026-11-01T00:00:00.000Z',
    };
    vi.mocked(mockHttpClient.patch).mockResolvedValueOnce(mockProfile);

    const result = await endpoint.update(patchPayload);
    expect(mockHttpClient.patch).toHaveBeenCalledWith(
      '/api/v1/profile',
      userProfileSchema,
      patchPayload,
    );
    expect(result).toEqual(mockProfile);
  });

  it('calls client.post for password rotation', async () => {
    const changeDto = {
      currentPassword: 'oldPass1!',
      newPassword: 'newPass2@',
      confirmPassword: 'newPass2@',
    };
    const mockResponse = { success: true, message: 'Password rotated' };
    vi.mocked(mockHttpClient.post).mockResolvedValueOnce(mockResponse);

    const result = await endpoint.changePassword(changeDto);
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/api/v1/profile/change-password',
      changePasswordResponseSchema,
      changeDto,
    );
    expect(result).toEqual(mockResponse);
  });
});
