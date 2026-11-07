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
      accent: '#4279e8',
      text: '#1d3048',
    },
  },
  {
    id: 'darcula-light',
    name: 'Darcula Light',
    mode: 'light',
    description: 'Soft neutral surfaces with IntelliJ-inspired slate blue accents.',
    previewColors: {
      background: '#f3f4f6',
      surface: '#ffffff',
      accent: '#3574c8',
      text: '#30343b',
    },
  },
  {
    id: 'graphite-light',
    name: 'Graphite Light',
    mode: 'light',
    description: 'Cool neutral restrained monochrome palette for daylight focus.',
    previewColors: {
      background: '#f1f2f3',
      surface: '#ffffff',
      accent: '#596b80',
      text: '#292c30',
    },
  },
  {
    id: 'tokyo-light',
    name: 'Tokyo Day',
    mode: 'light',
    description: 'Cool lavender-blue daybreak aesthetic with clear accent hierarchy.',
    previewColors: {
      background: '#f2f4fa',
      surface: '#ffffff',
      accent: '#4b68c8',
      text: '#24283b',
    },
  },
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    mode: 'light',
    description: 'Soothing pastel light palette with lavender and teal undertones.',
    previewColors: {
      background: '#eff1f5',
      surface: '#ffffff',
      accent: '#586fc4',
      text: '#4c4f69',
    },
  },
];

export const DARK_THEMES: DarkThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Default',
    mode: 'dark',
    description: 'Standard tactical dark theme with deep abyss panels and warm amber accents.',
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
      background: '#232529',
      surface: '#2b2b2b',
      accent: '#4d90fe',
      text: '#a9b7c6',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite Stealth',
    mode: 'dark',
    description: 'Ultra-low contrast monochromatic carbon aesthetic for low-light command.',
    previewColors: {
      background: '#121212',
      surface: '#1c1c1c',
      accent: '#6b7a8f',
      text: '#e0e0e0',
    },
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    mode: 'dark',
    description: 'Cyberpunk midnight indigo with electric cyan and magenta neon accents.',
    previewColors: {
      background: '#16161e',
      surface: '#1a1b26',
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
