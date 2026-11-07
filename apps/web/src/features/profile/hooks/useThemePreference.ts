import { useCallback } from 'react';

import { type DarkThemeId, type ThemeId, type ThemeMode, useTheme } from '../../theme';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  mode: ThemeMode;
  description: string;
  previewColors: {
    background: string;
    surface: string;
    accent: string;
    text: string;
  };
}

export const AVAILABLE_THEMES: ThemeOption[] = [
  {
    id: 'vanilla',
    name: 'Vanilla Light',
    mode: 'light',
    description: 'Clean high-contrast daylight palette with crisp neutral surfaces.',
    previewColors: {
      background: '#f8fafc',
      surface: '#ffffff',
      accent: '#2563eb',
      text: '#0f172a',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian Default',
    mode: 'dark',
    description: 'Standard tactical dark theme with deep abyss panels and warm amber accents.',
    previewColors: {
      background: '#0b0f17',
      surface: '#111827',
      accent: '#f59e0b',
      text: '#f3f4f6',
    },
  },
  {
    id: 'darcula',
    name: 'Darcula Classic',
    mode: 'dark',
    description: 'Refined IntelliJ-inspired slate palette with rich graphite undertones.',
    previewColors: {
      background: '#232525',
      surface: '#2b2d30',
      accent: '#3574f0',
      text: '#bcbec4',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite Stealth',
    mode: 'dark',
    description: 'Ultra-low contrast monochromatic carbon aesthetic for low-light command.',
    previewColors: {
      background: '#18181b',
      surface: '#27272a',
      accent: '#71717a',
      text: '#f4f4f5',
    },
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    mode: 'dark',
    description: 'Cyberpunk midnight indigo with electric cyan and magenta neon accents.',
    previewColors: {
      background: '#1a1b26',
      surface: '#24283b',
      accent: '#7aa2f7',
      text: '#c0caf5',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Macchiato',
    mode: 'dark',
    description: 'Warm soothing pastel tones over dark cocoa surfaces for ergonomic comfort.',
    previewColors: {
      background: '#1e2030',
      surface: '#24273a',
      accent: '#8aadf4',
      text: '#cad3f5',
    },
  },
];

export function useThemePreference() {
  const themeCtx = useTheme();

  const currentThemeId: ThemeId = themeCtx.activeThemeId ?? 'obsidian';

  const setTheme = useCallback(
    (themeId: ThemeId) => {
      if (themeId === 'vanilla') {
        themeCtx.setMode('light');
        themeCtx.setPreferredLight('vanilla');
      } else {
        themeCtx.setMode('dark');
        themeCtx.setPreferredDark(themeId as DarkThemeId);
      }

      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', themeId);
      }
      try {
        localStorage.setItem('dsm-theme-preference', themeId);
      } catch {
        // Ignore localStorage errors in restricted sandbox
      }
    },
    [themeCtx],
  );

  return {
    currentThemeId,
    setTheme,
    themes: AVAILABLE_THEMES,
  };
}
