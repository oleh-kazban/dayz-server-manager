import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ValidateServerPathsResponseDto } from '@aegis/api-contracts';

import { ApiError, HttpClient, ValidationError } from '../http-client';

import { createServersEndpoint } from './servers';

describe('Servers Endpoint', () => {
  let client: HttpClient;
  let servers: ReturnType<typeof createServersEndpoint>;
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    client = new HttpClient({ baseUrl: 'https://test-server' });
    servers = createServersEndpoint(client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const serverDetailDefaults = {
    maxPlayers: 60,
    rconIp: '127.0.0.1',
    rconPassword: null,
  };

  it('lists servers and parses response', async () => {
    const mockList = [
      {
        id: validUuid,
        name: 'DayZ (Local)',
        description: null,
        status: 'stopped',
        gamePort: 2302,
        queryPort: 27016,
        rconPort: 2310,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockList), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await servers.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('DayZ (Local)');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://test-server/api/v1/servers',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('gets server detail by id', async () => {
    const mockDetail = {
      id: validUuid,
      name: 'DayZ (Local)',
      description: null,
      status: 'stopped',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      isDefault: true,
      installPath: 'C:\\DayZServer',
      profilePath: 'C:\\DayZServer\\profiles',
      missionPath: 'mpmissions\\dayzOffline.chernarusplus',
      launchParameters: null,
      ...serverDetailDefaults,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockDetail), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await servers.get(validUuid);
    expect(result.id).toBe(validUuid);
    expect(result.installPath).toBe('C:\\DayZServer');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${validUuid}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('creates new server', async () => {
    const createDto = {
      name: 'New Server',
      installPath: '/opt/dayz',
      profilePath: '/opt/dayz/profiles',
      missionPath: 'mpmissions/dayzOffline.chernarusplus',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
    };

    const mockDetail = {
      id: validUuid,
      ...createDto,
      description: null,
      status: 'stopped',
      isDefault: false,
      launchParameters: null,
      ...serverDetailDefaults,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockDetail), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await servers.create(createDto);
    expect(result.id).toBe(validUuid);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://test-server/api/v1/servers',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(createDto) }),
    );
  });

  it('updates an existing server', async () => {
    const updateDto = { name: 'Updated Name' };
    const mockDetail = {
      id: validUuid,
      name: 'Updated Name',
      description: null,
      status: 'stopped',
      gamePort: 2302,
      queryPort: 27016,
      rconPort: 2310,
      isDefault: true,
      installPath: '/opt/dayz',
      profilePath: '/opt/dayz/profiles',
      missionPath: 'mpmissions/dayzOffline.chernarusplus',
      launchParameters: null,
      ...serverDetailDefaults,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockDetail), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await servers.update(validUuid, updateDto);
    expect(result.name).toBe('Updated Name');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${validUuid}`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(updateDto) }),
    );
  });

  it('deletes a server', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await servers.delete(validUuid);
    expect(result.success).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${validUuid}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  describe('validatePaths', () => {
    const buildValidationResponse = (): ValidateServerPathsResponseDto => ({
      serverId: validUuid,
      valid: true,
      platform: 'linux',
      checkedAt: new Date().toISOString(),
      paths: {
        installPath: {
          target: 'installPath',
          configuredPath: '/opt/dayz',
          resolvedPath: '/opt/dayz',
          status: 'valid',
          exists: true,
          isDirectory: true,
          executablePath: '/opt/dayz/DayZServer',
          executablePresent: true,
          executableRunnable: true,
        },
        profilePath: {
          target: 'profilePath',
          configuredPath: 'profiles',
          resolvedPath: '/opt/dayz/profiles',
          status: 'valid',
          exists: true,
          isDirectory: true,
          writable: true,
        },
        battleyePath: {
          target: 'battleyePath',
          configuredPath: '/opt/dayz/profiles/BattlEye',
          resolvedPath: '/opt/dayz/profiles/BattlEye',
          status: 'valid',
          exists: true,
          isDirectory: true,
          writable: true,
        },
        missionPath: {
          target: 'missionPath',
          configuredPath: 'mpmissions/dayzOffline.chernarusplus',
          resolvedPath: '/opt/dayz/mpmissions/dayzOffline.chernarusplus',
          status: 'valid',
          exists: true,
          isDirectory: true,
          hasInitScript: true,
          hasEconomyDb: true,
        },
      },
      discoveredMissions: [
        {
          name: 'dayzOffline.chernarusplus',
          relativePath: 'mpmissions/dayzOffline.chernarusplus',
          resolvedPath: '/opt/dayz/mpmissions/dayzOffline.chernarusplus',
          hasInitScript: true,
          hasEconomyDb: true,
        },
      ],
      issues: [],
    });

    it('validates persisted server paths when optional dto is omitted', async () => {
      const mockResponse = buildValidationResponse();
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      const result = await servers.validatePaths(validUuid);

      expect(result).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://test-server/api/v1/servers/${validUuid}/validate-paths`,
        expect.objectContaining({ method: 'POST', body: undefined }),
      );
      const [, requestInit] = fetchSpy.mock.calls[0];
      expect((requestInit?.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    });

    it('sends JSON draft path overrides when dto is supplied', async () => {
      const mockResponse = buildValidationResponse();
      const overrides = {
        installPath: '/opt/dayz-staging',
        missionPath: 'dayzOffline.enoch',
      };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      const result = await servers.validatePaths(validUuid, overrides);

      expect(result).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalledWith(
        `https://test-server/api/v1/servers/${validUuid}/validate-paths`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(overrides),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('throws ValidationError when response payload violates validateServerPathsResponseSchema', async () => {
      const invalidPayload = {
        ...buildValidationResponse(),
        serverId: 'not-a-uuid',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(invalidPayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      await expect(servers.validatePaths(validUuid)).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ApiError with errorCode when backend returns 403 or 400 error envelope', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              statusCode: 403,
              error: 'Forbidden',
              errorCode: 'AUTH_FORBIDDEN_ADMIN_REQUIRED',
              message: 'Admin role required',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        ),
      );

      await expect(servers.validatePaths(validUuid)).rejects.toMatchObject({
        name: 'ApiError',
        status: 403,
        errorCode: 'AUTH_FORBIDDEN_ADMIN_REQUIRED',
      });
      await expect(servers.validatePaths(validUuid)).rejects.toBeInstanceOf(ApiError);
    });
  });

  it('no longer exposes the removed serverDZ.cfg sync-config call', () => {
    expect(servers).not.toHaveProperty('syncConfig');
  });
});
