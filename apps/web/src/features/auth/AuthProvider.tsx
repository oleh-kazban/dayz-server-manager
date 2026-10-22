import { ReactNode, useMemo, useState } from 'react';

import { AuthContext } from './auth.context';
import { authStorage } from './auth.storage';
import { AuthContextValue, AuthUser, SignInCredentials } from './auth.types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(authStorage.get);

  const login = (credentials: SignInCredentials) => {
    const user: AuthUser = {
      id: crypto.randomUUID(),
      username: credentials.usernameOrEmail,
      email: credentials.usernameOrEmail,
      role: 'admin',
      roles: ['admin'],
    };

    authStorage.set(user, credentials.rememberMe);
    setUser(user);
  };

  const logout = () => {
    authStorage.clear();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
