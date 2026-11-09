import { z } from 'zod';

import {
  type SteamChallengeAbortDto,
  type SteamChallengeResponseDto,
  type SteamDiagnosticsResultDto,
  steamDiagnosticsResultSchema,
  type SteamSettingsDto,
  steamSettingsSchema,
  type UpdateSteamSettingsDto,
} from '@aegis/api-contracts';

import { type HttpClient } from '../http-client';

const sessionClearResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

const challengeActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export function createSteamEndpoint(client: HttpClient) {
  return {
    getSettings: (): Promise<SteamSettingsDto> =>
      client.get('/api/v1/settings/steam', steamSettingsSchema),

    updateSettings: (dto: UpdateSteamSettingsDto): Promise<SteamSettingsDto> =>
      client.patch('/api/v1/settings/steam', steamSettingsSchema, dto),

    clearSession: (): Promise<{ success: boolean; message?: string }> =>
      client.post('/api/v1/settings/steam/session/clear', sessionClearResponseSchema),

    loginSession: (): Promise<{ success: boolean; message?: string }> =>
      client.post('/api/v1/settings/steam/session/login', sessionClearResponseSchema),

    respondChallenge: (
      dto: SteamChallengeResponseDto,
    ): Promise<{ success: boolean; message?: string }> =>
      client.post('/api/v1/settings/steam/challenge/respond', challengeActionResponseSchema, dto),

    abortChallenge: (
      dto: SteamChallengeAbortDto,
    ): Promise<{ success: boolean; message?: string }> =>
      client.post('/api/v1/settings/steam/challenge/abort', challengeActionResponseSchema, dto),

    runDiagnostics: (): Promise<SteamDiagnosticsResultDto> =>
      client.post('/api/v1/settings/steam/diagnostics', steamDiagnosticsResultSchema),
  };
}
