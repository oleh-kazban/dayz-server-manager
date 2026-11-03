import { z } from 'zod';

export const userRoleSchema = z.enum(['admin', 'moderator', 'viewer']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const authUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  email: z.string().email().optional(),
  role: userRoleSchema,
});
export type AuthUserDto = z.infer<typeof authUserSchema>;

export const signInRequestSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
export type SignInRequestDto = z.infer<typeof signInRequestSchema>;

export const signInResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().positive(),
});
export type SignInResponseDto = z.infer<typeof signInResponseSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequestDto = z.infer<typeof refreshRequestSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().positive().default(900),
});
export type RefreshResponseDto = z.infer<typeof refreshResponseSchema>;
