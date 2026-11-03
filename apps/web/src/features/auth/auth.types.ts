import { z } from 'zod';

export const userRoleSchema = z.enum(['admin', 'moderator', 'viewer']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: userRoleSchema,
  roles: z.array(userRoleSchema).optional(),
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
}
