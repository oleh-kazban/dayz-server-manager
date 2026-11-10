import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../../index';
import { HttpClient, ValidationError } from '../http-client';

import { createModsEndpoint } from './mods';

const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const MOD_ID = '22222222-2222-4222-8222-222222222222';
const NOW_ISO = '2026-11-10T20:00:00.000Z';

const sampleModDto = {
  id: MOD_ID,
  serverId: SERVER_ID,
  sourceType: 'workshop' as const,
  loadTarget: 'client_server' as const,
  workshopId: '1559212036',
  workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036',
  folderName: '@CF',
  name: 'CF',
  sizeBytes: 1024,
  remoteUpdatedAt: NOW_ISO,
  syncedWorkshopUpdatedAt: NOW_ISO,
  lastSyncedAt: NOW_ISO,
  syncStatus: 'up_to_date' as const,
  enabled: true,
  loadOrder: 0,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

const sampleLaunchPreview = {
  modFlag: '-mod=@CF',
  serverModFlag: '',
  combinedArgs: ['-mod=@CF'],
  missingFolderCount: 0,
};

const sampleListResponse = {
  mods: [sampleModDto],
  launchPreview: sampleLaunchPreview,
  updateAvailableCount: 0,
};

const sampleResolvedItem = {
  workshopId: '1559212036',
  name: 'CF',
  suggestedFolderName: '@CF',
  shortDescription: 'Community Framework',
  previewUrl: null,
  sizeBytes: 1024,
  remoteUpdatedAt: NOW_ISO,
  subscriptions: 5000,
  tags: ['Mod'],
};

function mockJsonFetch(payload: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('Mods Endpoint (libs/api-client)', () => {
  let client: HttpClient;
  let mods: ReturnType<typeof createModsEndpoint>;

  beforeEach(() => {
    client = new HttpClient({ baseUrl: 'https://test-server' });
    mods = createModsEndpoint(client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wires mods endpoint onto createApiClient()', () => {
    const api = createApiClient({ baseUrl: 'https://test-server' });
    expect(typeof api.mods.list).toBe('function');
    expect(typeof api.mods.searchWorkshop).toBe('function');
  });

  it('lists server mods via GET /api/v1/servers/:id/mods', async () => {
    const fetchSpy = mockJsonFetch(sampleListResponse);

    const res = await mods.list(SERVER_ID);
    expect(res.mods).toHaveLength(1);
    expect(res.launchPreview.modFlag).toBe('-mod=@CF');
    expect(fetchSpy).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${SERVER_ID}/mods`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('adds a single mod via POST /api/v1/servers/:id/mods', async () => {
    const fetchSpy = mockJsonFetch(sampleModDto, 201);
    const dto = {
      sourceType: 'workshop' as const,
      workshopId: '1559212036',
      name: 'CF',
      folderName: '@CF',
      loadTarget: 'client_server' as const,
      enabled: true,
      markAsInstalled: true,
    };

    const created = await mods.add(SERVER_ID, dto);
    expect(created.id).toBe(MOD_ID);
    expect(fetchSpy).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${SERVER_ID}/mods`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(dto) }),
    );
  });

  it('batch adds mods via POST /api/v1/servers/:id/mods/batch', async () => {
    const batchResp = {
      added: [sampleModDto],
      skippedCount: 1,
      ...sampleListResponse,
    };
    const fetchSpy = mockJsonFetch(batchResp, 201);
    const dto = {
      mods: [
        {
          sourceType: 'workshop' as const,
          workshopId: '1559212036',
          name: 'CF',
          folderName: '@CF',
        },
      ],
    };

    const res = await mods.batchAdd(SERVER_ID, dto);
    expect(res.skippedCount).toBe(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${SERVER_ID}/mods/batch`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(dto) }),
    );
  });

  it('updates, deletes, reorders, and checks updates on server mods', async () => {
    const updateSpy = mockJsonFetch({ ...sampleModDto, enabled: false });
    const updated = await mods.update(SERVER_ID, MOD_ID, { enabled: false });
    expect(updated.enabled).toBe(false);
    expect(updateSpy).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${SERVER_ID}/mods/${MOD_ID}`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ enabled: false }) }),
    );

    vi.restoreAllMocks();
    const deleteSpy = mockJsonFetch({ success: true });
    const deleted = await mods.delete(SERVER_ID, MOD_ID);
    expect(deleted.success).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${SERVER_ID}/mods/${MOD_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );

    vi.restoreAllMocks();
    const reorderSpy = mockJsonFetch(sampleListResponse);
    await mods.reorder(SERVER_ID, { modIds: [MOD_ID] });
    expect(reorderSpy).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${SERVER_ID}/mods/reorder`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ modIds: [MOD_ID] }) }),
    );

    vi.restoreAllMocks();
    const checkSpy = mockJsonFetch(sampleListResponse);
    await mods.checkUpdates(SERVER_ID);
    expect(checkSpy).toHaveBeenCalledWith(
      `https://test-server/api/v1/servers/${SERVER_ID}/mods/check-updates`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls workshop lookup and serializes search query parameters', async () => {
    const lookupSpy = mockJsonFetch({
      kind: 'item',
      collectionTitle: null,
      items: [sampleResolvedItem],
      skippedCount: 0,
    });
    const lookupRes = await mods.lookupWorkshop({ input: '1559212036' });
    expect(lookupRes.kind).toBe('item');
    expect(lookupSpy).toHaveBeenCalledWith(
      'https://test-server/api/v1/workshop/lookup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ input: '1559212036' }),
      }),
    );

    vi.restoreAllMocks();
    const searchSpy = mockJsonFetch({
      items: [sampleResolvedItem],
      total: 1,
      page: 2,
      pageSize: 10,
    });
    const searchRes = await mods.searchWorkshop({ q: 'CF', page: 2, pageSize: 10 });
    expect(searchRes.total).toBe(1);
    expect(searchSpy).toHaveBeenCalledWith(
      'https://test-server/api/v1/workshop/search?q=CF&page=2&pageSize=10',
      expect.objectContaining({ method: 'GET' }),
    );

    vi.restoreAllMocks();
    const emptyQuerySpy = mockJsonFetch({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    await mods.searchWorkshop({});
    expect(emptyQuerySpy).toHaveBeenCalledWith(
      'https://test-server/api/v1/workshop/search',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws ValidationError when server returns payload violating Zod contract', async () => {
    mockJsonFetch({ mods: 'not-an-array' });
    await expect(mods.list(SERVER_ID)).rejects.toThrow(ValidationError);
  });
});
