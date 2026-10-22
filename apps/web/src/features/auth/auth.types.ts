export type UserRole = 'admin' | 'moderator' | 'viewer';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
}

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
