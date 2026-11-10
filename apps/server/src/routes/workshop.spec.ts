import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type DatabaseInstance,
  encryptVaultSecret,
  initDatabase,
  resolveVaultKey,
  steamSettings,
} from '@aegis/database';

import { buildApp } from '../app/app';
import { loadEnv } from '../config/env';
import { SteamWorkshopError, steamWorkshopService } from '../services/steam/steam-workshop.service';

describe('Workshop Routes (/api/v1/workshop)', () => {
  let app: FastifyInstance;
  let dbInstance: DatabaseInstance;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    dbInstance = initDatabase({ dbPath: ':memory:' });
    const config = loadEnv({
      SESSION_SECRET: 'test-session-secret-at-least-32-chars-long!',
      LOG_LEVEL: 'silent',
    });

    app = buildApp({ config, db: dbInstance });
    await app.ready();

    adminToken = app.jwt.sign(
      { sub: 'admin-id', role: 'admin', type: 'access' },
      { expiresIn: '15m' },
    );
    viewerToken = app.jwt.sign(
      { sub: 'viewer-id', role: 'viewer', type: 'access' },
      { expiresIn: '15m' },
    );
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    dbInstance.db
      .update(steamSettings)
      .set({ steamWebApiKeyEncrypted: null, workshopAppId: 221100 })
      .where(eq(steamSettings.id, 'default'))
      .run();
  });

  afterAll(async () => {
    await app.close();
    dbInstance.close();
  });

  describe('RBAC Boundaries', () => {
    it('returns 401 unauthenticated and 403 for viewer on lookup and search', async () => {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/workshop/lookup',
            payload: { input: '1559212036' },
          })
        ).statusCode,
      ).toBe(401);
      expect(
        (await app.inject({ method: 'GET', url: '/api/v1/workshop/search?q=CF' })).statusCode,
      ).toBe(401);

      const viewerLookup = await app.inject({
        method: 'POST',
        url: '/api/v1/workshop/lookup',
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: { input: '1559212036' },
      });
      expect(viewerLookup.statusCode).toBe(403);
      expect(viewerLookup.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');

      const viewerSearch = await app.inject({
        method: 'GET',
        url: '/api/v1/workshop/search?q=CF',
        headers: { authorization: `Bearer ${viewerToken}` },
      });
      expect(viewerSearch.statusCode).toBe(403);
      expect(viewerSearch.json().errorCode).toBe('AUTH_FORBIDDEN_ADMIN_REQUIRED');
    });
  });

  describe('POST /api/v1/workshop/lookup', () => {
    it('validates body, resolves workshop items using configured workshopAppId, and maps SteamWorkshopError', async () => {
      const badReq = await app.inject({
        method: 'POST',
        url: '/api/v1/workshop/lookup',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { input: '   ' },
      });
      expect(badReq.statusCode).toBe(400);
      expect(badReq.json().errorCode).toBe('VALIDATION_FAILED');

      const lookupSpy = vi.spyOn(steamWorkshopService, 'lookupWorkshop').mockResolvedValueOnce({
        kind: 'item',
        collectionTitle: null,
        items: [
          {
            workshopId: '1559212036',
            name: 'CF',
            suggestedFolderName: '@CF',
            shortDescription: 'Community Framework',
            previewUrl: null,
            sizeBytes: 1024,
            remoteUpdatedAt: '2026-11-10T10:00:00.000Z',
          },
        ],
        skippedCount: 0,
      });

      const okRes = await app.inject({
        method: 'POST',
        url: '/api/v1/workshop/lookup',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { input: '1559212036' },
      });
      expect(okRes.statusCode).toBe(200);
      expect(okRes.json().items[0].name).toBe('CF');
      expect(lookupSpy).toHaveBeenCalledWith('1559212036', 221100);

      vi.spyOn(steamWorkshopService, 'lookupWorkshop').mockRejectedValueOnce(
        new SteamWorkshopError(400, 'STEAM_WORKSHOP_INVALID_INPUT', 'Invalid URL'),
      );
      const invalidRes = await app.inject({
        method: 'POST',
        url: '/api/v1/workshop/lookup',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { input: 'https://evil.com/?id=123' },
      });
      expect(invalidRes.statusCode).toBe(400);
      expect(invalidRes.json().errorCode).toBe('STEAM_WORKSHOP_INVALID_INPUT');
    });
  });

  describe('GET /api/v1/workshop/search (GUARD-MOD-06)', () => {
    it('returns 400 STEAM_WEB_API_KEY_REQUIRED when no encrypted Steam Web API key is stored', async () => {
      const searchSpy = vi.spyOn(steamWorkshopService, 'searchWorkshop');

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/workshop/search?q=CF',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().errorCode).toBe('STEAM_WEB_API_KEY_REQUIRED');
      expect(searchSpy).not.toHaveBeenCalled();
    });

    it('decrypts stored Steam Web API key server-side and returns paginated results without leaking key', async () => {
      const encryptedKey = encryptVaultSecret('MY_DECRYPTED_STEAM_KEY_999', resolveVaultKey());
      dbInstance.db
        .update(steamSettings)
        .set({ steamWebApiKeyEncrypted: encryptedKey })
        .where(eq(steamSettings.id, 'default'))
        .run();

      const searchSpy = vi.spyOn(steamWorkshopService, 'searchWorkshop').mockResolvedValueOnce({
        items: [
          {
            workshopId: '1559212036',
            name: 'CF',
            suggestedFolderName: '@CF',
            shortDescription: 'Community Framework',
            previewUrl: null,
            sizeBytes: 2048,
            remoteUpdatedAt: '2026-11-10T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 2,
        pageSize: 10,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/workshop/search?q=CF&page=2&pageSize=10',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(searchSpy).toHaveBeenCalledWith({
        apiKey: 'MY_DECRYPTED_STEAM_KEY_999',
        query: 'CF',
        page: 2,
        pageSize: 10,
        workshopAppId: 221100,
      });
      expect(res.body).not.toContain('MY_DECRYPTED_STEAM_KEY_999');
      expect(res.json().items[0].workshopId).toBe('1559212036');
    });

    it('returns 400 VALIDATION_FAILED for out-of-bounds query params and 502 on upstream failure', async () => {
      const badQuery = await app.inject({
        method: 'GET',
        url: '/api/v1/workshop/search?page=0&pageSize=99',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(badQuery.statusCode).toBe(400);
      expect(badQuery.json().errorCode).toBe('VALIDATION_FAILED');

      const encryptedKey = encryptVaultSecret('KEY_ABC', resolveVaultKey());
      dbInstance.db
        .update(steamSettings)
        .set({ steamWebApiKeyEncrypted: encryptedKey })
        .where(eq(steamSettings.id, 'default'))
        .run();

      vi.spyOn(steamWorkshopService, 'searchWorkshop').mockRejectedValueOnce(
        new SteamWorkshopError(502, 'STEAM_WORKSHOP_API_ERROR', 'Steam upstream failed'),
      );

      const errRes = await app.inject({
        method: 'GET',
        url: '/api/v1/workshop/search?q=CF',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(errRes.statusCode).toBe(502);
      expect(errRes.json().errorCode).toBe('STEAM_WORKSHOP_API_ERROR');
    });
  });
});
