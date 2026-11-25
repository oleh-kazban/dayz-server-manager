import { z } from 'zod';

import { signInResponseSchema } from './auth.contract';
import { passwordSchema, usernameSchema } from './credentials.contract';

export const setupRootRequestSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SetupRootRequestDto = z.infer<typeof setupRootRequestSchema>;

export const setupRootResponseSchema = signInResponseSchema;
export type SetupRootResponseDto = z.infer<typeof setupRootResponseSchema>;
