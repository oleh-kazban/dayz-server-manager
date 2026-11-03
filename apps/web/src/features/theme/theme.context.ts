import { createContext, useContext } from 'react';

import type { ThemeContextValue } from './theme.types';

export const THEME_STORAGE_KEY = 'dsm-theme-settings';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider />');
  }

  return context;
}
