import {
  type ChangePasswordDto,
  type ChangePasswordResponseDto,
  changePasswordResponseSchema,
  type UpdateProfileDto,
  type UserProfileDto,
  userProfileSchema,
} from '@dsm/api-contracts';

import { type HttpClient } from '../http-client';

export function createProfileEndpoint(client: HttpClient) {
  return {
    get: (): Promise<UserProfileDto> => client.get('/api/v1/profile', userProfileSchema),

    update: (dto: UpdateProfileDto): Promise<UserProfileDto> =>
      client.patch('/api/v1/profile', userProfileSchema, dto),

    changePassword: (dto: ChangePasswordDto): Promise<ChangePasswordResponseDto> =>
      client.post('/api/v1/profile/change-password', changePasswordResponseSchema, dto),
  };
}
