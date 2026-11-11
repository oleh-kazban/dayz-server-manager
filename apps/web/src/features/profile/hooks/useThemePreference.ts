import { useCallback } from 'react';

import {
  type DarkThemeId,
  type LightThemeId,
  type ThemeId,
  type ThemeMode,
  useTheme,
} from '../../theme';

export interface ThemeOption<T extends ThemeId = ThemeId> {
  id: T;
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

export type LightThemeOption = ThemeOption<LightThemeId>;
export type DarkThemeOption = ThemeOption<DarkThemeId>;

export const LIGHT_THEMES: LightThemeOption[] = [
  {
    id: 'vanilla',
    name: 'Vanilla Light',
    mode: 'light',
    description: 'Clean high-contrast daylight palette with crisp neutral surfaces.',
    previewColors: {
      background: '#f0f4f8',
      surface: '#ffffff',
      accent: '#3366d6',
      text: '#1d3048',
    },
  },
  {
    id: 'darcula-light',
    name: 'Darcula Light',
    mode: 'light',
    description: 'Soft neutral surfaces with IntelliJ-inspired slate blue accents.',
    previewColors: {
      background: '#ebedf0',
      surface: '#ffffff',
      accent: '#2f6bc4',
      text: '#2b2f36',
    },
  },
  {
    id: 'graphite-light',
    name: 'Graphite Light',
    mode: 'light',
    description: 'Cool neutral restrained monochrome palette for daylight focus.',
    previewColors: {
      background: '#ededef',
      surface: '#ffffff',
      accent: '#2c3540',
      text: '#23262a',
    },
  },
  {
    id: 'tokyo-light',
    name: 'Tokyo Day',
    mode: 'light',
    description: 'Cool lavender-blue daybreak aesthetic with clear accent hierarchy.',
    previewColors: {
      background: '#dfe1eb',
      surface: '#ffffff',
      accent: '#34548a',
      text: '#24283b',
    },
  },
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    mode: 'light',
    description: 'Soothing pastel light palette with lavender and teal undertones.',
    previewColors: {
      background: '#e6e9ef',
      surface: '#ffffff',
      accent: '#3d57b8',
      text: '#383b54',
    },
  },
];

export const DARK_THEMES: DarkThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Default',
    mode: 'dark',
    description: 'Standard tactical dark theme with deep abyss panels and cobalt blue accents.',
    previewColors: {
      background: '#090d12',
      surface: '#101620',
      accent: '#558bf2',
      text: '#f1f5f9',
    },
  },
  {
    id: 'darcula',
    name: 'Darcula Classic',
    mode: 'dark',
    description: 'Refined IntelliJ-inspired slate palette with rich graphite undertones.',
    previewColors: {
      background: '#1e1f22',
      surface: '#2b2d30',
      accent: '#548af7',
      text: '#c7ccd4',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite Stealth',
    mode: 'dark',
    description: 'Restrained monochromatic carbon aesthetic for low-light command.',
    previewColors: {
      background: '#101012',
      surface: '#1b1b1e',
      accent: '#94a3b8',
      text: '#e4e4e7',
    },
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    mode: 'dark',
    description: 'Cyberpunk midnight indigo with electric cyan and magenta neon accents.',
    previewColors: {
      background: '#13141c',
      surface: '#1b1d29',
      accent: '#7aa2f7',
      text: '#c0caf5',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    mode: 'dark',
    description: 'Warm soothing pastel tones over deep Mocha surfaces for ergonomic comfort.',
    previewColors: {
      background: '#11111b',
      surface: '#1e1e2e',
      accent: '#89b4fa',
      text: '#cdd6f4',
    },
  },
];

export const AVAILABLE_THEMES: ThemeOption[] = [...LIGHT_THEMES, ...DARK_THEMES];

export interface UseThemePreferenceReturn {
  mode?: ThemeMode;
  activeThemeId?: ThemeId;
  preferredLight?: LightThemeId;
  preferredDark?: DarkThemeId;
  setMode?: (mode: ThemeMode) => void;
  toggleTheme?: () => void;
  setPreferredLight?: (theme: LightThemeId) => void;
  setPreferredDark?: (theme: DarkThemeId) => void;
  lightThemes?: LightThemeOption[];
  darkThemes?: DarkThemeOption[];
  currentThemeId: ThemeId;
  themes: ThemeOption[];
  setTheme: (themeId: ThemeId) => void;
}

export function useThemePreference(): UseThemePreferenceReturn {
  const {
    mode,
    activeThemeId,
    preferredLight = 'vanilla',
    preferredDark = 'obsidian',
    setMode,
    toggleTheme,
    setPreferredLight,
    setPreferredDark,
  } = useTheme();

  const setTheme = useCallback(
    (themeId: ThemeId) => {
      if (LIGHT_THEMES.some(t => t.id === themeId)) {
        setPreferredLight?.(themeId as LightThemeId);
        setMode?.('light');
      } else {
        setPreferredDark?.(themeId as DarkThemeId);
        setMode?.('dark');
      }
    },
    [setMode, setPreferredDark, setPreferredLight],
  );

  return {
    mode,
    activeThemeId,
    preferredLight,
    preferredDark,
    setMode,
    toggleTheme,
    setPreferredLight,
    setPreferredDark,
    lightThemes: LIGHT_THEMES,
    darkThemes: DARK_THEMES,
    currentThemeId: activeThemeId,
    themes: AVAILABLE_THEMES,
    setTheme,
  };
}
