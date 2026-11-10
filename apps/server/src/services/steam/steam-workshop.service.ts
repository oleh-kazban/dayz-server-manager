import {
  type ApiErrorCode,
  type ApiErrorParams,
  STEAM_APP_IDS,
  type WorkshopLookupResponseDto,
  type WorkshopResolvedItemDto,
  type WorkshopSearchResponseDto,
} from '@aegis/api-contracts';

const STEAM_COLLECTION_DETAILS_URL =
  'https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/';
const STEAM_PUBLISHED_FILE_DETAILS_URL =
  'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/';
const STEAM_QUERY_FILES_URL = 'https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/';

const STEAM_REQUEST_TIMEOUT_MS = 10_000;
const STEAM_BATCH_LIMIT = 50;
const MAX_COLLECTION_ITEMS = 200;
const WORKSHOP_ID_REGEX = /^\d{1,20}$/;
const ALLOWED_WORKSHOP_HOSTS = new Set(['steamcommunity.com', 'www.steamcommunity.com']);

interface SteamPublishedFileTag {
  tag?: string;
}

interface SteamPublishedFileDetail {
  publishedfileid?: string;
  result?: number;
  title?: string;
  short_description?: string;
  file_description?: string;
  preview_url?: string;
  file_size?: number | string;
  time_updated?: number;
  subscriptions?: number;
  consumer_app_id?: number;
  tags?: SteamPublishedFileTag[];
}

interface SteamCollectionChild {
  publishedfileid?: string;
}

interface SteamCollectionDetail {
  publishedfileid?: string;
  result?: number;
  children?: SteamCollectionChild[];
}

export class SteamWorkshopError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: ApiErrorCode,
    message: string,
    public readonly params?: ApiErrorParams,
  ) {
    super(message);
    this.name = 'SteamWorkshopError';
  }
}

export function parseWorkshopId(input: string): string {
  const trimmed = input.trim();
  if (WORKSHOP_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new SteamWorkshopError(
      400,
      'STEAM_WORKSHOP_INVALID_INPUT',
      'Input must be a numeric Steam Workshop ID or a steamcommunity.com Workshop URL.',
    );
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new SteamWorkshopError(
      400,
      'STEAM_WORKSHOP_INVALID_INPUT',
      'Only http and https Steam Workshop URLs are permitted.',
    );
  }

  if (!ALLOWED_WORKSHOP_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
    throw new SteamWorkshopError(
      400,
      'STEAM_WORKSHOP_INVALID_INPUT',
      'Workshop URL host must be steamcommunity.com.',
    );
  }

  const idParam = parsedUrl.searchParams.get('id')?.trim() ?? '';
  if (!WORKSHOP_ID_REGEX.test(idParam)) {
    throw new SteamWorkshopError(
      400,
      'STEAM_WORKSHOP_INVALID_INPUT',
      'Workshop URL must contain a valid numeric id query parameter.',
    );
  }

  return idParam;
}

export function suggestModFolderName(title: string, workshopId: string): string {
  const sanitized = title
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .replace(/[;/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^@+/, '')
    .trim();

  if (!sanitized) {
    return `@Workshop_${workshopId}`;
  }

  return `@${sanitized}`.slice(0, 128);
}

function parseFileSize(rawSize: number | string | undefined): number | null {
  if (rawSize === undefined || rawSize === null || rawSize === '') {
    return null;
  }
  const numeric = Number(rawSize);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return Math.trunc(numeric);
}

function parseUnixTimestampIso(seconds: number | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  return new Date(seconds * 1000).toISOString();
}

function mapPublishedFileToResolvedItem(detail: SteamPublishedFileDetail): WorkshopResolvedItemDto {
  const workshopId = String(detail.publishedfileid ?? '');
  const title = detail.title?.trim() || `Workshop Item ${workshopId}`;
  const rawDescription = detail.short_description ?? detail.file_description ?? null;
  const shortDescription = rawDescription ? rawDescription.slice(0, 300) : null;
  const tags = (detail.tags ?? [])
    .map(entry => entry.tag?.trim())
    .filter((tag): tag is string => Boolean(tag));

  return {
    workshopId,
    name: title,
    suggestedFolderName: suggestModFolderName(title, workshopId),
    shortDescription,
    previewUrl: detail.preview_url?.trim() || null,
    sizeBytes: parseFileSize(detail.file_size),
    remoteUpdatedAt: parseUnixTimestampIso(detail.time_updated),
    subscriptions:
      typeof detail.subscriptions === 'number' && detail.subscriptions >= 0
        ? Math.trunc(detail.subscriptions)
        : null,
    tags,
  };
}

async function fetchSteamJson<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(STEAM_REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new SteamWorkshopError(
      502,
      'STEAM_WORKSHOP_API_ERROR',
      `Failed to contact Steam Workshop API: ${(err as Error).message}`,
    );
  }

  if (!response.ok) {
    throw new SteamWorkshopError(
      502,
      'STEAM_WORKSHOP_API_ERROR',
      `Steam Workshop API returned HTTP ${response.status}.`,
      { status: response.status },
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new SteamWorkshopError(
      502,
      'STEAM_WORKSHOP_API_ERROR',
      'Steam Workshop API returned an invalid JSON payload.',
    );
  }
}

export class SteamWorkshopService {
  private async getCollectionDetails(collectionId: string): Promise<SteamCollectionDetail | null> {
    const body = new URLSearchParams({
      collectioncount: '1',
      'publishedfileids[0]': collectionId,
    });

    const data = await fetchSteamJson<{
      response?: { collectiondetails?: SteamCollectionDetail[] };
    }>(STEAM_COLLECTION_DETAILS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    return data.response?.collectiondetails?.[0] ?? null;
  }

  private async getPublishedFileDetailsChunk(
    workshopIds: string[],
  ): Promise<SteamPublishedFileDetail[]> {
    if (workshopIds.length === 0) {
      return [];
    }

    const body = new URLSearchParams({
      itemcount: String(workshopIds.length),
    });
    workshopIds.forEach((id, index) => {
      body.set(`publishedfileids[${index}]`, id);
    });

    const data = await fetchSteamJson<{
      response?: { publishedfiledetails?: SteamPublishedFileDetail[] };
    }>(STEAM_PUBLISHED_FILE_DETAILS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    return data.response?.publishedfiledetails ?? [];
  }

  public async getPublishedFileDetailsBatched(
    workshopIds: string[],
  ): Promise<SteamPublishedFileDetail[]> {
    const uniqueIds = Array.from(new Set(workshopIds));
    const results: SteamPublishedFileDetail[] = [];

    for (let i = 0; i < uniqueIds.length; i += STEAM_BATCH_LIMIT) {
      const chunk = uniqueIds.slice(i, i + STEAM_BATCH_LIMIT);
      const chunkDetails = await this.getPublishedFileDetailsChunk(chunk);
      results.push(...chunkDetails);
    }

    return results;
  }

  public async fetchPublishedFileMetadataMap(
    workshopIds: string[],
  ): Promise<Map<string, { sizeBytes: number | null; remoteUpdatedAt: Date | null }>> {
    const details = await this.getPublishedFileDetailsBatched(workshopIds);
    const map = new Map<string, { sizeBytes: number | null; remoteUpdatedAt: Date | null }>();

    for (const detail of details) {
      if (detail.result !== 1 || !detail.publishedfileid) {
        continue;
      }
      const remoteUpdatedAt =
        typeof detail.time_updated === 'number' && detail.time_updated > 0
          ? new Date(detail.time_updated * 1000)
          : null;
      map.set(String(detail.publishedfileid), {
        sizeBytes: parseFileSize(detail.file_size),
        remoteUpdatedAt,
      });
    }

    return map;
  }

  public async lookupWorkshop(
    input: string,
    workshopAppId: number = STEAM_APP_IDS.DAYZ_WORKSHOP,
  ): Promise<WorkshopLookupResponseDto> {
    const publishedFileId = parseWorkshopId(input);
    const collectionDetail = await this.getCollectionDetails(publishedFileId);
    const childIds = (collectionDetail?.children ?? [])
      .map(child => child.publishedfileid?.trim())
      .filter((id): id is string => Boolean(id && WORKSHOP_ID_REGEX.test(id)));

    if (collectionDetail?.result === 1 && childIds.length > 0) {
      return this.resolveCollection(publishedFileId, childIds, workshopAppId);
    }

    return this.resolveSingleItem(publishedFileId, workshopAppId);
  }

  private async resolveCollection(
    collectionId: string,
    rawChildIds: string[],
    workshopAppId: number,
  ): Promise<WorkshopLookupResponseDto> {
    const boundedChildIds = rawChildIds.slice(0, MAX_COLLECTION_ITEMS);
    const allDetails = await this.getPublishedFileDetailsBatched([
      collectionId,
      ...boundedChildIds,
    ]);
    const detailById = new Map(
      allDetails.filter(d => Boolean(d.publishedfileid)).map(d => [String(d.publishedfileid), d]),
    );

    const collectionHeader = detailById.get(collectionId);
    const collectionTitle =
      collectionHeader?.result === 1 && collectionHeader.title?.trim()
        ? collectionHeader.title.trim()
        : null;

    const items: WorkshopResolvedItemDto[] = [];
    let skippedCount = 0;

    for (const childId of boundedChildIds) {
      const detail = detailById.get(childId);
      if (!detail || detail.result !== 1 || detail.consumer_app_id !== workshopAppId) {
        skippedCount += 1;
        continue;
      }
      items.push(mapPublishedFileToResolvedItem(detail));
    }

    return {
      kind: 'collection',
      collectionTitle,
      items,
      skippedCount,
    };
  }

  private async resolveSingleItem(
    publishedFileId: string,
    workshopAppId: number,
  ): Promise<WorkshopLookupResponseDto> {
    const [detail] = await this.getPublishedFileDetailsChunk([publishedFileId]);
    if (!detail || detail.result !== 1 || !detail.title) {
      throw new SteamWorkshopError(
        404,
        'STEAM_WORKSHOP_NOT_FOUND',
        `Steam Workshop item ${publishedFileId} was not found or is private.`,
        { workshopId: publishedFileId },
      );
    }

    if (detail.consumer_app_id !== workshopAppId) {
      return {
        kind: 'item',
        collectionTitle: null,
        items: [],
        skippedCount: 1,
      };
    }

    return {
      kind: 'item',
      collectionTitle: null,
      items: [mapPublishedFileToResolvedItem(detail)],
      skippedCount: 0,
    };
  }

  public async searchWorkshop(options: {
    apiKey: string;
    query: string;
    page: number;
    pageSize: number;
    workshopAppId?: number;
  }): Promise<WorkshopSearchResponseDto> {
    const appId = options.workshopAppId ?? STEAM_APP_IDS.DAYZ_WORKSHOP;
    const params = new URLSearchParams({
      key: options.apiKey,
      appid: String(appId),
      page: String(options.page),
      numperpage: String(options.pageSize),
      return_metadata: '1',
      return_short_description: '1',
      return_tags: '1',
      query_type: options.query ? '12' : '3',
    });

    if (options.query) {
      params.set('search_text', options.query);
    }

    const data = await fetchSteamJson<{
      response?: {
        total?: number;
        publishedfiledetails?: SteamPublishedFileDetail[];
      };
    }>(`${STEAM_QUERY_FILES_URL}?${params.toString()}`, {
      method: 'GET',
    });

    const rawItems = data.response?.publishedfiledetails ?? [];
    const items = rawItems
      .filter(item => Boolean(item.publishedfileid) && item.result !== 9)
      .map(mapPublishedFileToResolvedItem);

    return {
      items,
      total: typeof data.response?.total === 'number' ? data.response.total : items.length,
      page: options.page,
      pageSize: options.pageSize,
    };
  }
}

export const steamWorkshopService = new SteamWorkshopService();
