import { z } from 'zod';

import {
  type AddServerModDto,
  type BatchAddServerModsDto,
  type BatchAddServerModsResponseDto,
  batchAddServerModsResponseSchema,
  type ReorderServerModsDto,
  type ServerModDto,
  serverModSchema,
  type ServerModsListResponseDto,
  serverModsListResponseSchema,
  type UpdateServerModDto,
  type WorkshopLookupRequestDto,
  type WorkshopLookupResponseDto,
  workshopLookupResponseSchema,
  type WorkshopSearchQueryDto,
  type WorkshopSearchResponseDto,
  workshopSearchResponseSchema,
} from '@aegis/api-contracts';

import { type HttpClient } from '../http-client';

const deleteModResponseSchema = z.object({ success: z.boolean() });

export function createModsEndpoint(client: HttpClient) {
  return {
    list: (serverId: string): Promise<ServerModsListResponseDto> =>
      client.get(`/api/v1/servers/${serverId}/mods`, serverModsListResponseSchema),

    add: (serverId: string, dto: AddServerModDto): Promise<ServerModDto> =>
      client.post(`/api/v1/servers/${serverId}/mods`, serverModSchema, dto),

    batchAdd: (
      serverId: string,
      dto: BatchAddServerModsDto,
    ): Promise<BatchAddServerModsResponseDto> =>
      client.post(`/api/v1/servers/${serverId}/mods/batch`, batchAddServerModsResponseSchema, dto),

    update: (serverId: string, modId: string, dto: UpdateServerModDto): Promise<ServerModDto> =>
      client.patch(`/api/v1/servers/${serverId}/mods/${modId}`, serverModSchema, dto),

    delete: (serverId: string, modId: string): Promise<{ success: boolean }> =>
      client.delete(`/api/v1/servers/${serverId}/mods/${modId}`, deleteModResponseSchema),

    reorder: (serverId: string, dto: ReorderServerModsDto): Promise<ServerModsListResponseDto> =>
      client.put(`/api/v1/servers/${serverId}/mods/reorder`, serverModsListResponseSchema, dto),

    checkUpdates: (serverId: string): Promise<ServerModsListResponseDto> =>
      client.post(`/api/v1/servers/${serverId}/mods/check-updates`, serverModsListResponseSchema),

    lookupWorkshop: (dto: WorkshopLookupRequestDto): Promise<WorkshopLookupResponseDto> =>
      client.post('/api/v1/workshop/lookup', workshopLookupResponseSchema, dto),

    searchWorkshop: (query: WorkshopSearchQueryDto): Promise<WorkshopSearchResponseDto> => {
      const params = new URLSearchParams();
      if (query.q !== undefined) params.set('q', query.q);
      if (query.page !== undefined) params.set('page', String(query.page));
      if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
      const qs = params.toString();
      return client.get(
        qs ? `/api/v1/workshop/search?${qs}` : '/api/v1/workshop/search',
        workshopSearchResponseSchema,
      );
    },
  };
}
