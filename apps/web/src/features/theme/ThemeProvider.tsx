import { ReactNode, useEffect, useState } from 'react';

import { localStorageDriver } from '@dsm/core/storage';

import { THEME_STORAGE_KEY, ThemeContext } from './theme.context';
import { DarkThemeId, LightThemeId, ThemeMode, ThemeSettings } from './theme.types';

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

  const toggleTheme = () => {
    setSettings(prev => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : 'light',
    }));
  };

  const setMode = (mode: ThemeMode) => {
    setSettings(prev => ({
      ...prev,
      mode,
    }));
  };

  const setPrefferedDark = (theme: DarkThemeId) => {
    setSettings(prev => ({
      ...prev,
      prefferedDark: theme,
    }));
  };

  const setPrefferedLight = (theme: LightThemeId) => {
    setSettings(prev => ({
      ...prev,
      prefferedLight: theme,
    }));
  };

  return (
    <ThemeContext.Provider
      value={{
        mode: settings.mode,
        activeThemeId,
        toggleTheme,
        setMode,
        setPrefferedDark,
        setPrefferedLight,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
