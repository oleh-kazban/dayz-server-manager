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
    name: 'Namalsk Day',
    mode: 'light',
    description: 'Crisp sub-arctic slate daylight with Aegis Royal Blue accents.',
    previewColors: {
      background: '#f0f4f8',
      surface: '#ffffff',
      accent: '#3366d6',
      text: '#1d3048',
    },
  },
  {
    id: 'frostline-light',
    name: 'Frostline Day',
    mode: 'light',
    description: 'Glacial ice-mist surfaces with sharp arctic teal-cyan accents.',
    previewColors: {
      background: '#e3f0f5',
      surface: '#ffffff',
      accent: '#0e7490',
      text: '#0f2936',
    },
  },
  {
    id: 'chernarus-light',
    name: 'Chernarus Overcast',
    mode: 'light',
    description: 'Zero-chroma overcast stone palette with crisp carbon ink controls.',
    previewColors: {
      background: '#ebebea',
      surface: '#ffffff',
      accent: '#27272a',
      text: '#18181b',
    },
  },
  {
    id: 'livonia-light',
    name: 'Livonia Clearing',
    mode: 'light',
    description: 'Misty boreal sage surfaces paired with tactical pine-emerald.',
    previewColors: {
      background: '#e9ede7',
      surface: '#ffffff',
      accent: '#2d6a4f',
      text: '#1a2920',
    },
  },
  {
    id: 'badlands-light',
    name: 'Badlands Sun',
    mode: 'light',
    description: 'Sun-baked desert sandstone surfaces with rich burnt ochre accents.',
    previewColors: {
      background: '#f3eadc',
      surface: '#ffffff',
      accent: '#b45309',
      text: '#332415',
    },
  },
  {
    id: 'krasno-light',
    name: 'Krasno Dawn',
    mode: 'light',
    description: 'Warm blush-alabaster backdrop with high-contrast crimson-ruby accents.',
    previewColors: {
      background: '#f5e9ec',
      surface: '#ffffff',
      accent: '#9d174d',
      text: '#361822',
    },
  },
];

export const DARK_THEMES: DarkThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Namalsk Night',
    mode: 'dark',
    description: 'Deep polar obsidian panels paired with tactical cobalt blue accents.',
    previewColors: {
      background: '#090d12',
      surface: '#101620',
      accent: '#558bf2',
      text: '#f1f5f9',
    },
  },
  {
    id: 'frostline-dark',
    name: 'Sakhal Night',
    mode: 'dark',
    description: 'Abyssal glacial sea surfaces lit by crisp frost-teal telemetry.',
    previewColors: {
      background: '#081318',
      surface: '#11242d',
      accent: '#2dd4bf',
      text: '#e6f4f8',
    },
  },
  {
    id: 'chernarus-dark',
    name: 'Tisy Bunker',
    mode: 'dark',
    description: 'Pure monochromatic bunker carbon with high-contrast steel accents.',
    previewColors: {
      background: '#111112',
      surface: '#1d1d20',
      accent: '#e4e4e7',
      text: '#f4f4f5',
    },
  },
  {
    id: 'livonia-dark',
    name: 'Nadbor Pine',
    mode: 'dark',
    description: 'Deep woodland charcoal with forest moss-emerald highlights.',
    previewColors: {
      background: '#0f1410',
      surface: '#1a221c',
      accent: '#52b788',
      text: '#e9f2eb',
    },
  },
  {
    id: 'badlands-dark',
    name: 'Badlands Dusk',
    mode: 'dark',
    description: 'Warm desert espresso surfaces glowing with golden amber highlights.',
    previewColors: {
      background: '#16100b',
      surface: '#251b13',
      accent: '#f59e0b',
      text: '#f7ede2',
    },
  },
  {
    id: 'krasno-dark',
    name: 'Signal Flare',
    mode: 'dark',
    description: 'Dark cinder surfaces illuminated by warm crimson-rose road flares.',
    previewColors: {
      background: '#170e12',
      surface: '#26171d',
      accent: '#f472b6',
      text: '#faeef2',
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
