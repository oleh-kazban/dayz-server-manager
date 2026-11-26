import { z } from 'zod';

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

export const LOGOUT_TIMEOUT_MS = 5000;

export function createAuthEndpoint(client: HttpClient) {
  return {
    login: (dto: SignInRequestDto): Promise<SignInResponseDto> =>
      client.post('/api/v1/auth/login', signInResponseSchema, dto),

    refresh: (dto: RefreshRequestDto): Promise<RefreshResponseDto> =>
      client.post('/api/v1/auth/refresh', refreshResponseSchema, dto),

    /** Ends the session on the server; bounded so a hanging server never blocks sign-out. */
    logout: (): Promise<void> =>
      client.post('/api/v1/auth/logout', z.void(), undefined, {
        signal: AbortSignal.timeout(LOGOUT_TIMEOUT_MS),
      }),

    me: (): Promise<AuthUserDto> => client.get('/api/v1/auth/me', authUserSchema),
  };
}
