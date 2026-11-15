import {
  type AcquireConfigLockRequestDto,
  type BootstrapServerDzConfigRequestDto,
  type ConfigLockResponseDto,
  configLockResponseSchema,
  type ConfigLockSessionRequestDto,
  type ConfigRevisionDetailDto,
  configRevisionDetailSchema,
  type ConfigRevisionListDto,
  configRevisionListSchema,
  type ReleaseConfigLockResponseDto,
  releaseConfigLockResponseSchema,
  type RestoreConfigRevisionRequestDto,
  type SaveServerDzConfigRequestDto,
  type SaveServerDzConfigResponseDto,
  saveServerDzConfigResponseSchema,
  type ServerDzConfigResponseDto,
  serverDzConfigResponseSchema,
  type SyncBattlEyeConfigResponseDto,
  syncBattlEyeConfigResponseSchema,
  type ValidateServerDzConfigRequestDto,
  type ValidateServerDzConfigResponseDto,
  validateServerDzConfigResponseSchema,
} from '@aegis/api-contracts';

import { type HttpClient } from '../http-client';

function serverDzPath(serverId: string): string {
  return `/api/v1/servers/${serverId}/config/server-dz`;
}

export function createServerConfigEndpoint(client: HttpClient) {
  return {
    getServerDzConfig: (
      serverId: string,
      sessionToken?: string,
    ): Promise<ServerDzConfigResponseDto> => {
      const query = sessionToken ? `?${new URLSearchParams({ sessionToken }).toString()}` : '';
      return client.get(`${serverDzPath(serverId)}${query}`, serverDzConfigResponseSchema);
    },

    validateServerDzConfig: (
      serverId: string,
      dto: ValidateServerDzConfigRequestDto,
    ): Promise<ValidateServerDzConfigResponseDto> =>
      client.post(`${serverDzPath(serverId)}/validate`, validateServerDzConfigResponseSchema, dto),

    saveServerDzConfig: (
      serverId: string,
      dto: SaveServerDzConfigRequestDto,
    ): Promise<SaveServerDzConfigResponseDto> =>
      client.put(serverDzPath(serverId), saveServerDzConfigResponseSchema, dto),

    bootstrapServerDzConfig: (
      serverId: string,
      dto: BootstrapServerDzConfigRequestDto,
    ): Promise<SaveServerDzConfigResponseDto> =>
      client.post(`${serverDzPath(serverId)}/bootstrap`, saveServerDzConfigResponseSchema, dto),

    acquireConfigLock: (
      serverId: string,
      dto: AcquireConfigLockRequestDto,
    ): Promise<ConfigLockResponseDto> =>
      client.post(`${serverDzPath(serverId)}/lock`, configLockResponseSchema, dto),

    heartbeatConfigLock: (
      serverId: string,
      dto: ConfigLockSessionRequestDto,
    ): Promise<ConfigLockResponseDto> =>
      client.post(`${serverDzPath(serverId)}/lock/heartbeat`, configLockResponseSchema, dto),

    releaseConfigLock: (
      serverId: string,
      dto: ConfigLockSessionRequestDto,
    ): Promise<ReleaseConfigLockResponseDto> =>
      client.post(`${serverDzPath(serverId)}/lock/release`, releaseConfigLockResponseSchema, dto, {
        keepalive: true,
      }),

    listConfigRevisions: (serverId: string): Promise<ConfigRevisionListDto> =>
      client.get(`${serverDzPath(serverId)}/revisions`, configRevisionListSchema),

    getConfigRevision: (serverId: string, revisionId: string): Promise<ConfigRevisionDetailDto> =>
      client.get(`${serverDzPath(serverId)}/revisions/${revisionId}`, configRevisionDetailSchema),

    restoreConfigRevision: (
      serverId: string,
      revisionId: string,
      dto: RestoreConfigRevisionRequestDto,
    ): Promise<SaveServerDzConfigResponseDto> =>
      client.post(
        `${serverDzPath(serverId)}/revisions/${revisionId}/restore`,
        saveServerDzConfigResponseSchema,
        dto,
      ),

    syncBattlEyeConfig: (serverId: string): Promise<SyncBattlEyeConfigResponseDto> =>
      client.post(
        `/api/v1/servers/${serverId}/config/battleye/sync`,
        syncBattlEyeConfigResponseSchema,
      ),
  };
}
