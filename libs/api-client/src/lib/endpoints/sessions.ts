import { z } from 'zod';

import {
  type RevokeOthersResponseDto,
  revokeOthersResponseSchema,
  type SessionListResponseDto,
  sessionListResponseSchema,
} from '@aegis/api-contracts';

import { type HttpClient } from '../http-client';

const revokeSessionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type RevokeSessionResponseDto = z.infer<typeof revokeSessionResponseSchema>;

export function createSessionsEndpoint(client: HttpClient) {
  return {
    list: (): Promise<SessionListResponseDto> =>
      client.get('/api/v1/auth/sessions', sessionListResponseSchema),

    revoke: (id: string): Promise<RevokeSessionResponseDto> =>
      client.delete(`/api/v1/auth/sessions/${id}`, revokeSessionResponseSchema),

    revokeOthers: (): Promise<RevokeOthersResponseDto> =>
      client.post('/api/v1/auth/sessions/revoke-others', revokeOthersResponseSchema),
  };
}
