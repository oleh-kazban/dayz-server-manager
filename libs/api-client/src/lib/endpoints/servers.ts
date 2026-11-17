import { z } from 'zod';

import {
  type CreateServerDto,
  type LaunchCommandPreviewDto,
  launchCommandPreviewSchema,
  type ServerDetailDto,
  serverDetailSchema,
  type ServerLogKind,
  type ServerLogTailDto,
  serverLogTailSchema,
  type ServerSummaryDto,
  serverSummarySchema,
  type StopServerRequestDto,
  type UpdateServerDto,
  type ValidateServerPathsRequestDto,
  type ValidateServerPathsResponseDto,
  validateServerPathsResponseSchema,
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

    validatePaths: (
      id: string,
      dto?: ValidateServerPathsRequestDto,
    ): Promise<ValidateServerPathsResponseDto> =>
      client.post(`/api/v1/servers/${id}/validate-paths`, validateServerPathsResponseSchema, dto),

    /**
     * End of the newest log file (DSM-00206): last lines with line numbers and the byte `offset`
     * to continue from on `/servers/:id/logs/:kind/stream?ticket=…&file=…&from=…`.
     */
    getLog: (id: string, kind: ServerLogKind): Promise<ServerLogTailDto> =>
      client.get(`/api/v1/servers/${id}/logs/${kind}`, serverLogTailSchema),

    getLaunchCommand: (id: string): Promise<LaunchCommandPreviewDto> =>
      client.get(`/api/v1/servers/${id}/launch-command`, launchCommandPreviewSchema),

    /** Starts the server process (DSM-00162); resolves with the server as `starting`. */
    start: (id: string): Promise<ServerDetailDto> =>
      client.post(`/api/v1/servers/${id}/start`, serverDetailSchema),

    /**
     * Graceful stop (DSM-00163): now, or after `delaySec` with an in-game warning (DSM-00167).
     * Resolves with the server `stopping`, or still `running` with a `pendingStop`.
     */
    stop: (id: string, dto?: StopServerRequestDto): Promise<ServerDetailDto> =>
      client.post(`/api/v1/servers/${id}/stop`, serverDetailSchema, dto),

    /**
     * Graceful stop, then start (DSM-00168): now, or after `delaySec` with an in-game warning.
     * Resolves once the stop is requested (`stopping`, or `running` with a `pendingStop`), with
     * `restartRequested: true`; the start follows when the process has exited.
     */
    restart: (id: string, dto?: StopServerRequestDto): Promise<ServerDetailDto> =>
      client.post(`/api/v1/servers/${id}/restart`, serverDetailSchema, dto),

    /** Cancels a pending delayed stop or restart (DSM-00167). */
    cancelStop: (id: string): Promise<ServerDetailDto> =>
      client.post(`/api/v1/servers/${id}/stop/cancel`, serverDetailSchema),

    /** Kills the process tree without a save flush (DSM-00162); resolves with the server `stopped`. */
    forceStop: (id: string): Promise<ServerDetailDto> =>
      client.post(`/api/v1/servers/${id}/force-stop`, serverDetailSchema),
  };
}
