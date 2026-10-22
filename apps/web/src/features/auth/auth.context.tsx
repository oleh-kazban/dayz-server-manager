import { createContext, useContext } from 'react';

import { AuthContextValue } from './auth.types';

export const AUTH_STORAGE_KEY = 'dsm-auth-session';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth should be used within <AuthProvider />');
  }

  return context;
}
