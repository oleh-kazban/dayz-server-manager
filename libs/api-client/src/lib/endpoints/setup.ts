import {
  type SetupRootRequestDto,
  type SetupRootResponseDto,
  setupRootResponseSchema,
} from '@aegis/api-contracts';

import { type HttpClient } from '../http-client';

export function createSetupEndpoint(client: HttpClient) {
  return {
    setupRoot: (dto: SetupRootRequestDto): Promise<SetupRootResponseDto> =>
      client.post('/api/v1/setup/root', setupRootResponseSchema, dto),
  };
}
