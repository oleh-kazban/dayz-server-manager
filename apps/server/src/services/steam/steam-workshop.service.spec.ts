import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  parseWorkshopId,
  SteamWorkshopError,
  SteamWorkshopService,
  suggestModFolderName,
} from './steam-workshop.service';

describe('SteamWorkshopService (apps/server)', () => {
  let service: SteamWorkshopService;

  beforeEach(() => {
    service = new SteamWorkshopService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GUARD-MOD-05: parseWorkshopId & SSRF Allowlist', () => {
    it('accepts raw numeric IDs and steamcommunity.com http/https URLs', () => {
      expect(parseWorkshopId('1559212036')).toBe('1559212036');
      expect(parseWorkshopId('  221100  ')).toBe('221100');
      expect(
        parseWorkshopId('https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036'),
      ).toBe('1559212036');
      const httpScheme = 'http';
      expect(
        parseWorkshopId(
          `${httpScheme}://www.steamcommunity.com/workshop/filedetails/?id=1564026768&searchtext=cot`,
        ),
      ).toBe('1564026768');
    });

    it('rejects disallowed hosts, schemes, malformed URLs, and non-numeric IDs without calling fetch', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const ftpScheme = 'ftp';

      const invalidInputs = [
        'not-a-number',
        'https://evil.com/sharedfiles/filedetails/?id=1559212036',
        'http://127.0.0.1:8080/sharedfiles/filedetails/?id=1559212036',
        'file:///etc/passwd?id=1559212036',
        `${ftpScheme}://steamcommunity.com/sharedfiles/filedetails/?id=1559212036`,
        'https://steamcommunity.com/sharedfiles/filedetails/?id=abc',
        'https://steamcommunity.com/sharedfiles/filedetails/',
        'https://sub.evilsteamcommunity.com/?id=1559212036',
      ];

      for (const input of invalidInputs) {
        expect(() => parseWorkshopId(input)).toThrow(SteamWorkshopError);
        try {
          parseWorkshopId(input);
        } catch (err) {
          expect((err as SteamWorkshopError).statusCode).toBe(400);
          expect((err as SteamWorkshopError).errorCode).toBe('STEAM_WORKSHOP_INVALID_INPUT');
        }

        await expect(service.lookupWorkshop(input)).rejects.toMatchObject({
          statusCode: 400,
          errorCode: 'STEAM_WORKSHOP_INVALID_INPUT',
        });
      }

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('suggestModFolderName', () => {
    it('sanitizes forbidden characters, normalizes leading @, and falls back when empty', () => {
      expect(suggestModFolderName('CF', '1559212036')).toBe('@CF');
      expect(suggestModFolderName('@@Dabs;Framework/v2\\..test\0', '999')).toBe(
        '@Dabs Framework v2 test',
      );
      expect(suggestModFolderName('@@@;;;///', '12345')).toBe('@Workshop_12345');
      expect(suggestModFolderName('A'.repeat(200), '1')).toHaveLength(128);
    });
  });

  describe('lookupWorkshop (Single Item & Collection Resolution)', () => {
    it('resolves a single DayZ Workshop item with metadata and suggested folder name', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ response: { collectiondetails: [{ result: 9 }] } }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              response: {
                publishedfiledetails: [
                  {
                    publishedfileid: '1559212036',
                    result: 1,
                    title: 'CF',
                    short_description: 'Community Framework',
                    preview_url: 'https://steamuserimages-a.akamaihd.net/cf.png',
                    file_size: '5242880',
                    time_updated: 1700000000,
                    subscriptions: 950000,
                    consumer_app_id: 221100,
                    tags: [{ tag: 'Mod' }, { tag: '' }],
                  },
                ],
              },
            }),
            { status: 200 },
          ),
        );

      const res = await service.lookupWorkshop(
        'https://steamcommunity.com/sharedfiles/filedetails/?id=1559212036',
      );

      expect(res.kind).toBe('item');
      expect(res.collectionTitle).toBeNull();
      expect(res.skippedCount).toBe(0);
      expect(res.items).toEqual([
        {
          workshopId: '1559212036',
          name: 'CF',
          suggestedFolderName: '@CF',
          shortDescription: 'Community Framework',
          previewUrl: 'https://steamuserimages-a.akamaihd.net/cf.png',
          sizeBytes: 5242880,
          remoteUpdatedAt: new Date(1700000000 * 1000).toISOString(),
          subscriptions: 950000,
          tags: ['Mod'],
        },
      ]);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    });

    it('throws 404 STEAM_WORKSHOP_NOT_FOUND when single item is missing or private', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ response: { collectiondetails: [] } }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              response: { publishedfiledetails: [{ publishedfileid: '999999', result: 9 }] },
            }),
            { status: 200 },
          ),
        );

      await expect(service.lookupWorkshop('999999')).rejects.toMatchObject({
        statusCode: 404,
        errorCode: 'STEAM_WORKSHOP_NOT_FOUND',
        params: { workshopId: '999999' },
      });
    });

    it('filters non-DayZ single items with skippedCount = 1', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ response: { collectiondetails: [] } }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              response: {
                publishedfiledetails: [
                  {
                    publishedfileid: '450814997',
                    result: 1,
                    title: 'CBA_A3',
                    consumer_app_id: 107410,
                  },
                ],
              },
            }),
            { status: 200 },
          ),
        );

      const res = await service.lookupWorkshop('450814997');
      expect(res).toEqual({
        kind: 'item',
        collectionTitle: null,
        items: [],
        skippedCount: 1,
      });
    });

    it('expands Steam collections, resolves collectionTitle, and counts non-DayZ/unavailable skipped items', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              response: {
                collectiondetails: [
                  {
                    publishedfileid: '3000000001',
                    result: 1,
                    children: [
                      { publishedfileid: '1559212036' },
                      { publishedfileid: '1564026768' },
                      { publishedfileid: '999999999' }, // non-DayZ
                      { publishedfileid: '888888888' }, // private/missing
                    ],
                  },
                ],
              },
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              response: {
                publishedfiledetails: [
                  {
                    publishedfileid: '3000000001',
                    result: 1,
                    title: 'Namalsk Essential Pack',
                    consumer_app_id: 221100,
                  },
                  {
                    publishedfileid: '1559212036',
                    result: 1,
                    title: 'CF',
                    consumer_app_id: 221100,
                    file_size: 1024,
                    time_updated: 1700000000,
                  },
                  {
                    publishedfileid: '1564026768',
                    result: 1,
                    title: 'Community-Online-Tools',
                    consumer_app_id: 221100,
                    file_size: 2048,
                    time_updated: 1700000100,
                  },
                  {
                    publishedfileid: '999999999',
                    result: 1,
                    title: 'Arma 3 Mod',
                    consumer_app_id: 107410,
                  },
                  {
                    publishedfileid: '888888888',
                    result: 9,
                  },
                ],
              },
            }),
            { status: 200 },
          ),
        );

      const res = await service.lookupWorkshop('3000000001');
      expect(res.kind).toBe('collection');
      expect(res.collectionTitle).toBe('Namalsk Essential Pack');
      expect(res.items.map(i => i.workshopId)).toEqual(['1559212036', '1564026768']);
      expect(res.skippedCount).toBe(2);
    });
  });

  describe('Batching & Metadata Map', () => {
    it('deduplicates workshopIds and chunks GetPublishedFileDetails calls into batches of 50', async () => {
      const ids = Array.from({ length: 120 }, (_, i) => String(100000 + i));
      const duplicatedIds = [...ids, ids[0], ids[1]];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
        const params = new URLSearchParams(String(init?.body ?? ''));
        const count = Number(params.get('itemcount'));
        const details = Array.from({ length: count }, (_, idx) => ({
          publishedfileid: params.get(`publishedfileids[${idx}]`)!,
          result: 1,
          file_size: 1000 + idx,
          time_updated: 1700000000 + idx,
        }));
        return new Response(JSON.stringify({ response: { publishedfiledetails: details } }), {
          status: 200,
        });
      });

      const metaMap = await service.fetchPublishedFileMetadataMap(duplicatedIds);

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      const firstBody = new URLSearchParams(String(fetchSpy.mock.calls[0][1]?.body));
      const secondBody = new URLSearchParams(String(fetchSpy.mock.calls[1][1]?.body));
      const thirdBody = new URLSearchParams(String(fetchSpy.mock.calls[2][1]?.body));
      expect(firstBody.get('itemcount')).toBe('50');
      expect(secondBody.get('itemcount')).toBe('50');
      expect(thirdBody.get('itemcount')).toBe('20');
      expect(metaMap.size).toBe(120);
      expect(metaMap.get('100000')?.sizeBytes).toBe(1000);
    });
  });

  describe('searchWorkshop', () => {
    it('queries IPublishedFileService/QueryFiles/v1/ with server-side API key and filters invalid items', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            response: {
              total: 42,
              publishedfiledetails: [
                {
                  publishedfileid: '1559212036',
                  result: 1,
                  title: 'CF',
                  file_size: 4096,
                  time_updated: 1700000000,
                },
                {
                  publishedfileid: '999',
                  result: 9,
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );

      const res = await service.searchWorkshop({
        apiKey: 'SECRET_STEAM_KEY',
        query: 'CF',
        page: 2,
        pageSize: 10,
      });

      const calledUrl = new URL(String(fetchSpy.mock.calls[0][0]));
      expect(calledUrl.origin + calledUrl.pathname).toBe(
        'https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/',
      );
      expect(calledUrl.searchParams.get('key')).toBe('SECRET_STEAM_KEY');
      expect(calledUrl.searchParams.get('appid')).toBe('221100');
      expect(calledUrl.searchParams.get('page')).toBe('2');
      expect(calledUrl.searchParams.get('numperpage')).toBe('10');
      expect(calledUrl.searchParams.get('query_type')).toBe('12');
      expect(calledUrl.searchParams.get('search_text')).toBe('CF');

      expect(res.total).toBe(42);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].workshopId).toBe('1559212036');
    });
  });

  describe('Upstream Error & Timeout Mapping', () => {
    it('maps network errors, non-OK HTTP responses, and malformed JSON to 502 STEAM_WORKSHOP_API_ERROR', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ETIMEDOUT'));
      await expect(service.lookupWorkshop('1559212036')).rejects.toMatchObject({
        statusCode: 502,
        errorCode: 'STEAM_WORKSHOP_API_ERROR',
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Service Unavailable', { status: 503 }),
      );
      await expect(service.lookupWorkshop('1559212036')).rejects.toMatchObject({
        statusCode: 502,
        errorCode: 'STEAM_WORKSHOP_API_ERROR',
        params: { status: 503 },
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('not-json', { status: 200 }),
      );
      await expect(service.lookupWorkshop('1559212036')).rejects.toMatchObject({
        statusCode: 502,
        errorCode: 'STEAM_WORKSHOP_API_ERROR',
      });
    });
  });
});
