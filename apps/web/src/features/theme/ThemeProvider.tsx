import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { localStorageDriver } from '@aegis/web/core/storage';

import { THEME_STORAGE_KEY, ThemeContext } from './theme.context';
import {
  type DarkThemeId,
  type LightThemeId,
  type ThemeContextValue,
  type ThemeMode,
  type ThemeSettings,
  themeSettingsSchema,
} from './theme.types';

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'light',
  preferredLight: 'vanilla',
  preferredDark: 'obsidian',
};

function getInitialSettings(): ThemeSettings {
  return localStorageDriver.get<ThemeSettings>(
    THEME_STORAGE_KEY,
    DEFAULT_THEME_SETTINGS,
    themeSettingsSchema,
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(getInitialSettings);
  const activeThemeId =
    settings.mode === 'light' ? settings.preferredLight : settings.preferredDark;
  const prevThemeRef = useRef(activeThemeId);

  useEffect(() => {
    const root = document.documentElement;
    const isThemeSwitch = prevThemeRef.current !== activeThemeId;
    prevThemeRef.current = activeThemeId;

    let rafId1 = 0;
    let rafId2 = 0;

    if (isThemeSwitch) {
      root.classList.add('theme-switching');
    }

    root.setAttribute('data-theme', activeThemeId);
    localStorageDriver.set(THEME_STORAGE_KEY, settings);

    if (isThemeSwitch) {
      rafId1 = window.requestAnimationFrame(() => {
        rafId2 = window.requestAnimationFrame(() => {
          root.classList.remove('theme-switching');
        });
      });
    }

    return () => {
      if (rafId1) window.cancelAnimationFrame(rafId1);
      if (rafId2) window.cancelAnimationFrame(rafId2);
      root.classList.remove('theme-switching');
    };
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
      preferredLight: settings.preferredLight,
      preferredDark: settings.preferredDark,
      toggleTheme,
      setMode,
      setPreferredDark,
      setPreferredLight,
    }),
    [
      settings.mode,
      activeThemeId,
      settings.preferredLight,
      settings.preferredDark,
      toggleTheme,
      setMode,
      setPreferredDark,
      setPreferredLight,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
