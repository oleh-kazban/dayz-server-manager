import {
  type AuthUserDto,
  authUserSchema,
  type RefreshRequestDto,
  type RefreshResponseDto,
  refreshResponseSchema,
  type SignInRequestDto,
  type SignInResponseDto,
  signInResponseSchema,
} from '@aegis/api-contracts';

import { type HttpClient } from '../http-client';

export function createAuthEndpoint(client: HttpClient) {
  return {
    login: (dto: SignInRequestDto): Promise<SignInResponseDto> =>
      client.post('/api/v1/auth/login', signInResponseSchema, dto),

    refresh: (dto: RefreshRequestDto): Promise<RefreshResponseDto> =>
      client.post('/api/v1/auth/refresh', refreshResponseSchema, dto),

    me: (): Promise<AuthUserDto> => client.get('/api/v1/auth/me', authUserSchema),
  };
}
