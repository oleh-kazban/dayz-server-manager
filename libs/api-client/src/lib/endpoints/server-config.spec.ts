import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ConfigLockResponseDto,
  type ConfigRevisionSummaryDto,
  type SaveServerDzConfigResponseDto,
  type ServerDzConfigResponseDto,
  type SyncBattlEyeConfigResponseDto,
} from '@aegis/api-contracts';

import { createApiClient } from '../../index';
import { ApiError, HttpClient, ValidationError } from '../http-client';

import { createServerConfigEndpoint } from './server-config';

const BASE_URL = 'https://test-server';
const SERVER_ID = '11111111-1111-4111-a111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_TOKEN = '33333333-3333-4333-8333-333333333333';
const HASH = 'b'.repeat(64);
const NOW_ISO = '2026-11-14T12:00:00.000Z';
const CONFIG_PATH = `${BASE_URL}/api/v1/servers/${SERVER_ID}/config/server-dz`;

const lock: ConfigLockResponseDto = {
  holderUserId: 'user-1',
  holderName: 'admin',
  acquiredAt: NOW_ISO,
  expiresAt: '2026-11-14T12:02:00.000Z',
  heldByYou: true,
};

const revision: ConfigRevisionSummaryDto = {
  id: REVISION_ID,
  source: 'editor',
  authorUserId: 'user-1',
  authorName: 'admin',
  contentHash: HASH,
  createdAt: NOW_ISO,
};

const saveResponse: SaveServerDzConfigResponseDto = {
  contentHash: HASH,
  projection: {
    missionTemplate: 'dayzOffline.chernarusplus',
    steamQueryPort: 2305,
    maxPlayers: 60,
  },
  diagnostics: [
    {
      severity: 'warning',
      code: 'UNKNOWN_SETTING',
      message: "Unknown setting 'foo'",
      line: 4,
      column: 1,
      endLine: 4,
      endColumn: 4,
    },
  ],
  revision,
};

const loadResponse: ServerDzConfigResponseDto = {
  exists: true,
  content: 'hostname = "x";\npassword = "plain-pass";\n',
  contentHash: HASH,
  eol: 'crlf',
  hasBom: false,
  sizeBytes: 42,
  projection: saveResponse.projection,
  serverRunning: false,
  lock,
  latestRevision: revision,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Server Config Endpoint', () => {
  let client: HttpClient;
  let endpoint: ReturnType<typeof createServerConfigEndpoint>;

  beforeEach(() => {
    client = new HttpClient({ baseUrl: BASE_URL });
    client.setToken('access-token');
    endpoint = createServerConfigEndpoint(client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(body: unknown, status = 200) {
    return vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(jsonResponse(body, status)));
  }

  function lastRequest(fetchSpy: ReturnType<typeof mockFetch>): { url: string; init: RequestInit } {
    const [url, init] = fetchSpy.mock.calls.at(-1) ?? [];
    return { url: String(url), init: init ?? {} };
  }

  describe('getServerDzConfig', () => {
    it('GETs the plaintext serverDZ.cfg without a query string when no session token is given', async () => {
      const fetchSpy = mockFetch(loadResponse);

      await expect(endpoint.getServerDzConfig(SERVER_ID)).resolves.toEqual(loadResponse);

      const { url, init } = lastRequest(fetchSpy);
      expect(url).toBe(CONFIG_PATH);
      expect(init.method).toBe('GET');
      expect(init.body).toBeUndefined();
    });

    it('passes the session token as an encoded query parameter', async () => {
      const fetchSpy = mockFetch(loadResponse);

      await endpoint.getServerDzConfig(SERVER_ID, SESSION_TOKEN);
      expect(lastRequest(fetchSpy).url).toBe(`${CONFIG_PATH}?sessionToken=${SESSION_TOKEN}`);

      await endpoint.getServerDzConfig(SERVER_ID, 'a b&c=d');
      expect(lastRequest(fetchSpy).url).toBe(`${CONFIG_PATH}?sessionToken=a+b%26c%3Dd`);
    });

    it('parses the missing-file response', async () => {
      const missing = {
        ...loadResponse,
        exists: false,
        content: null,
        contentHash: null,
        projection: null,
        lock: null,
        latestRevision: null,
        sizeBytes: 0,
      };
      mockFetch(missing);

      await expect(endpoint.getServerDzConfig(SERVER_ID)).resolves.toEqual(missing);
    });

    it('throws ValidationError when the response violates the contract', async () => {
      mockFetch({ ...loadResponse, contentHash: 'not-a-sha' });

      await expect(endpoint.getServerDzConfig(SERVER_ID)).rejects.toBeInstanceOf(ValidationError);
    });
  });

  it('POSTs content to /validate and parses diagnostics', async () => {
    const response = { valid: false, diagnostics: saveResponse.diagnostics };
    const fetchSpy = mockFetch(response);
    const dto = { content: 'foo = 1;' };

    await expect(endpoint.validateServerDzConfig(SERVER_ID, dto)).resolves.toEqual(response);

    const { url, init } = lastRequest(fetchSpy);
    expect(url).toBe(`${CONFIG_PATH}/validate`);
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(dto) });
  });

  it('PUTs the edited content with session token and base hash on save', async () => {
    const fetchSpy = mockFetch(saveResponse);
    const dto = { sessionToken: SESSION_TOKEN, baseHash: HASH, content: 'hostname = "x";' };

    await expect(endpoint.saveServerDzConfig(SERVER_ID, dto)).resolves.toEqual(saveResponse);

    const { url, init } = lastRequest(fetchSpy);
    expect(url).toBe(CONFIG_PATH);
    expect(init).toMatchObject({
      method: 'PUT',
      body: JSON.stringify(dto),
      headers: expect.objectContaining({
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      }),
    });
  });

  it('surfaces CONFIG_HASH_MISMATCH conflicts as ApiError with the error code', async () => {
    mockFetch(
      {
        statusCode: 409,
        error: 'Conflict',
        errorCode: 'CONFIG_HASH_MISMATCH',
        message: 'serverDZ.cfg changed on disk',
      },
      409,
    );

    const rejection = endpoint.saveServerDzConfig(SERVER_ID, {
      sessionToken: SESSION_TOKEN,
      baseHash: HASH,
      content: '',
    });
    await expect(rejection).rejects.toBeInstanceOf(ApiError);
    await expect(rejection).rejects.toMatchObject({
      status: 409,
      errorCode: 'CONFIG_HASH_MISMATCH',
    });
  });

  it('POSTs to /bootstrap with the session token', async () => {
    const fetchSpy = mockFetch({ ...saveResponse, revision: { ...revision, source: 'template' } });
    const dto = { sessionToken: SESSION_TOKEN };

    const result = await endpoint.bootstrapServerDzConfig(SERVER_ID, dto);

    expect(result.revision.source).toBe('template');
    const { url, init } = lastRequest(fetchSpy);
    expect(url).toBe(`${CONFIG_PATH}/bootstrap`);
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(dto) });
  });

  describe('edit lock', () => {
    it('POSTs to /lock with the takeover flag', async () => {
      const fetchSpy = mockFetch(lock);
      const dto = { sessionToken: SESSION_TOKEN, takeover: true };

      await expect(endpoint.acquireConfigLock(SERVER_ID, dto)).resolves.toEqual(lock);

      const { url, init } = lastRequest(fetchSpy);
      expect(url).toBe(`${CONFIG_PATH}/lock`);
      expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(dto) });
      expect(init.keepalive).toBeUndefined();
    });

    it('surfaces CONFIG_EDIT_LOCKED with flat holder params', async () => {
      mockFetch(
        {
          statusCode: 409,
          error: 'Conflict',
          errorCode: 'CONFIG_EDIT_LOCKED',
          message: 'Being edited by alice',
          params: { holderName: 'alice', acquiredAt: NOW_ISO },
        },
        409,
      );

      await expect(
        endpoint.acquireConfigLock(SERVER_ID, { sessionToken: SESSION_TOKEN }),
      ).rejects.toMatchObject({
        status: 409,
        errorCode: 'CONFIG_EDIT_LOCKED',
        params: { holderName: 'alice', acquiredAt: NOW_ISO },
      });
    });

    it('POSTs to /lock/heartbeat', async () => {
      const fetchSpy = mockFetch(lock);
      const dto = { sessionToken: SESSION_TOKEN };

      await expect(endpoint.heartbeatConfigLock(SERVER_ID, dto)).resolves.toEqual(lock);

      const { url, init } = lastRequest(fetchSpy);
      expect(url).toBe(`${CONFIG_PATH}/lock/heartbeat`);
      expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(dto) });
    });

    it('POSTs to /lock/release with keepalive and the bearer token so it survives page unload', async () => {
      const fetchSpy = mockFetch({ released: true });
      const dto = { sessionToken: SESSION_TOKEN };

      await expect(endpoint.releaseConfigLock(SERVER_ID, dto)).resolves.toEqual({ released: true });

      const { url, init } = lastRequest(fetchSpy);
      expect(url).toBe(`${CONFIG_PATH}/lock/release`);
      expect(init).toMatchObject({
        method: 'POST',
        keepalive: true,
        body: JSON.stringify(dto),
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      });
    });

    it('throws ValidationError when the release response is malformed', async () => {
      mockFetch({ released: 'yes' });

      await expect(
        endpoint.releaseConfigLock(SERVER_ID, { sessionToken: SESSION_TOKEN }),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('revisions', () => {
    it('GETs the revision list', async () => {
      const fetchSpy = mockFetch([
        revision,
        { ...revision, source: 'external', authorUserId: null, authorName: null },
      ]);

      const result = await endpoint.listConfigRevisions(SERVER_ID);

      expect(result.map(r => r.source)).toEqual(['editor', 'external']);
      const { url, init } = lastRequest(fetchSpy);
      expect(url).toBe(`${CONFIG_PATH}/revisions`);
      expect(init.method).toBe('GET');
    });

    it('GETs a single revision with its content', async () => {
      const detail = { ...revision, content: 'hostname = "x";' };
      const fetchSpy = mockFetch(detail);

      await expect(endpoint.getConfigRevision(SERVER_ID, REVISION_ID)).resolves.toEqual(detail);
      expect(lastRequest(fetchSpy).url).toBe(`${CONFIG_PATH}/revisions/${REVISION_ID}`);
    });

    it('throws ValidationError when a revision detail has no content', async () => {
      mockFetch(revision);

      await expect(endpoint.getConfigRevision(SERVER_ID, REVISION_ID)).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('POSTs to /revisions/:revisionId/restore with session token and base hash', async () => {
      const fetchSpy = mockFetch({ ...saveResponse, revision: { ...revision, source: 'restore' } });
      const dto = { sessionToken: SESSION_TOKEN, baseHash: HASH };

      const result = await endpoint.restoreConfigRevision(SERVER_ID, REVISION_ID, dto);

      expect(result.revision.source).toBe('restore');
      const { url, init } = lastRequest(fetchSpy);
      expect(url).toBe(`${CONFIG_PATH}/revisions/${REVISION_ID}/restore`);
      expect(init).toMatchObject({ method: 'POST', body: JSON.stringify(dto) });
    });
  });

  it('POSTs an empty body to /config/battleye/sync and parses the BattlEye-only result', async () => {
    const sync: SyncBattlEyeConfigResponseDto = {
      serverId: SERVER_ID,
      syncedAt: NOW_ISO,
      battleyeCfgPath: '/opt/dayz/profiles/BattlEye/beserver_x64.cfg',
      battleyeCfgWritten: true,
      staleActiveFilesRemoved: [],
      backupPaths: [],
    };
    const fetchSpy = mockFetch(sync);

    await expect(endpoint.syncBattlEyeConfig(SERVER_ID)).resolves.toEqual(sync);

    const { url, init } = lastRequest(fetchSpy);
    expect(url).toBe(`${BASE_URL}/api/v1/servers/${SERVER_ID}/config/battleye/sync`);
    expect(init).toMatchObject({ method: 'POST', body: undefined });
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('is exposed as serverConfig on the composed API client', async () => {
    const api = createApiClient({ baseUrl: BASE_URL });
    const fetchSpy = mockFetch(lock);

    await api.serverConfig.heartbeatConfigLock(SERVER_ID, { sessionToken: SESSION_TOKEN });

    expect(lastRequest(fetchSpy).url).toBe(`${CONFIG_PATH}/lock/heartbeat`);
  });
});
