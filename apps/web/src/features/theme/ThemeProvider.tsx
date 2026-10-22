import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { localStorageDriver } from '@dsm/core/storage';

import { THEME_STORAGE_KEY, ThemeContext } from './theme.context';
import {
  DarkThemeId,
  LightThemeId,
  ThemeContextValue,
  ThemeMode,
  ThemeSettings,
} from './theme.types';

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'light',
  prefferedLight: 'light',
  prefferedDark: 'darcula',
};

function getInitialSettings() {
  return localStorageDriver.get(THEME_STORAGE_KEY, DEFAULT_THEME_SETTINGS);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(getInitialSettings);
  const activeThemeId =
    settings.mode === 'light' ? settings.prefferedLight : settings.prefferedDark;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeThemeId);
    localStorageDriver.set(THEME_STORAGE_KEY, settings);
  }, [activeThemeId, settings]);

  const toggleTheme = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : 'light',
    }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setSettings(prev => ({
      ...prev,
      mode,
    }));
  }, []);

  const setPrefferedDark = useCallback((theme: DarkThemeId) => {
    setSettings(prev => ({
      ...prev,
      prefferedDark: theme,
    }));
  }, []);

  const setPrefferedLight = useCallback((theme: LightThemeId) => {
    setSettings(prev => ({
      ...prev,
      prefferedLight: theme,
    }));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: settings.mode,
      activeThemeId,
      toggleTheme,
      setMode,
      setPrefferedDark,
      setPrefferedLight,
    }),
    [settings.mode, activeThemeId, toggleTheme, setMode, setPrefferedDark, setPrefferedLight],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
