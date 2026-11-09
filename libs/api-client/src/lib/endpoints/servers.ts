import { z } from 'zod';

import {
  type CreateServerDto,
  type ServerDetailDto,
  serverDetailSchema,
  type ServerSummaryDto,
  serverSummarySchema,
  type UpdateServerDto,
} from '@aegis/api-contracts';

import { type HttpClient } from '../http-client';

const serverSummaryListSchema = z.array(serverSummarySchema);
const deleteResponseSchema = z.object({ success: z.boolean() });

export function createServersEndpoint(client: HttpClient) {
  return {
    list: (): Promise<ServerSummaryDto[]> => client.get('/api/v1/servers', serverSummaryListSchema),

    get: (id: string): Promise<ServerDetailDto> =>
      client.get(`/api/v1/servers/${id}`, serverDetailSchema),

    create: (dto: CreateServerDto): Promise<ServerDetailDto> =>
      client.post('/api/v1/servers', serverDetailSchema, dto),

    update: (id: string, dto: UpdateServerDto): Promise<ServerDetailDto> =>
      client.patch(`/api/v1/servers/${id}`, serverDetailSchema, dto),

    delete: (id: string): Promise<{ success: boolean }> =>
      client.delete(`/api/v1/servers/${id}`, deleteResponseSchema),
  };
}
