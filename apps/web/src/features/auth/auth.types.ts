import { z } from 'zod';

import { type SignInResponseDto, userRoleSchema } from '@aegis/api-contracts';

export { userRoleSchema };
export type UserRole = z.infer<typeof userRoleSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable().optional(),
  email: z.string(),
  role: userRoleSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;

export interface SignInCredentials {
  usernameOrEmail: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (credentials: SignInCredentials) => Promise<void> | void;
  logout: () => void;
  adoptSession: (response: SignInResponseDto) => void;
  updateUser?: (patch: Partial<AuthUser>) => void;
}
