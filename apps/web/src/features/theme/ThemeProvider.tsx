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
  preferredLight: 'light',
  preferredDark: 'darcula',
};

interface StoredThemeSettings {
  mode?: ThemeMode;
  preferredLight?: LightThemeId;
  preferredDark?: DarkThemeId;
  prefferedLight?: LightThemeId;
  prefferedDark?: DarkThemeId;
}

function getInitialSettings(): ThemeSettings {
  const stored = localStorageDriver.get<StoredThemeSettings>(
    THEME_STORAGE_KEY,
    DEFAULT_THEME_SETTINGS,
  );
  return {
    mode: stored.mode ?? DEFAULT_THEME_SETTINGS.mode,
    preferredLight:
      stored.preferredLight ?? stored.prefferedLight ?? DEFAULT_THEME_SETTINGS.preferredLight,
    preferredDark:
      stored.preferredDark ?? stored.prefferedDark ?? DEFAULT_THEME_SETTINGS.preferredDark,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(getInitialSettings);
  const activeThemeId =
    settings.mode === 'light' ? settings.preferredLight : settings.preferredDark;

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

  const setPreferredDark = useCallback((theme: DarkThemeId) => {
    setSettings(prev => ({
      ...prev,
      preferredDark: theme,
    }));
  }, []);

  const setPreferredLight = useCallback((theme: LightThemeId) => {
    setSettings(prev => ({
      ...prev,
      preferredLight: theme,
    }));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: settings.mode,
      activeThemeId,
      toggleTheme,
      setMode,
      setPreferredDark,
      setPreferredLight,
    }),
    [settings.mode, activeThemeId, toggleTheme, setMode, setPreferredDark, setPreferredLight],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
