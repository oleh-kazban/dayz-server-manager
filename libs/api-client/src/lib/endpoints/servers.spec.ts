import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpClient } from '../http-client';

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
});
