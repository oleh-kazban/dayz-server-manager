import { type HealthResponseDto, healthResponseSchema } from '@dsm/api-contracts';

import { type HttpClient } from '../http-client';

export function createHealthEndpoint(client: HttpClient) {
  return {
    get: (): Promise<HealthResponseDto> => client.get('/api/v1/health', healthResponseSchema),
  };
}
