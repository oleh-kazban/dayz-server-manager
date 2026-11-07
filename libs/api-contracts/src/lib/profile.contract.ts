import { z } from 'zod';

import { userRoleSchema } from './auth.contract';

export const userProfileSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  role: userRoleSchema,
  timezone: z.string().min(1).default('UTC'),
  timeFormat: z.enum(['12h', '24h']).default('24h'),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable().optional(),
});
export type UserProfileDto = z.infer<typeof userProfileSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  timezone: z.string().min(1).max(64).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .preprocess(
    (val: unknown) => {
      if (val && typeof val === 'object') {
        const record = val as Record<string, unknown>;
        if ('confirmNewPassword' in record && !('confirmPassword' in record)) {
          return { ...record, confirmPassword: record.confirmNewPassword };
        }
      }
      return val;
    },
    z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
      confirmPassword: z.string().min(1, 'Password confirmation is required'),
    }),
  )
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const changePasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type ChangePasswordResponseDto = z.infer<typeof changePasswordResponseSchema>;
