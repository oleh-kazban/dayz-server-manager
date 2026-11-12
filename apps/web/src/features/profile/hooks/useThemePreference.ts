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

type ThemeEntry<T extends ThemeId> = readonly [
  id: T,
  name: string,
  description: string,
  background: string,
  surface: string,
  accent: string,
  text: string,
];

function buildThemes<T extends ThemeId>(
  mode: ThemeMode,
  entries: readonly ThemeEntry<T>[],
): ThemeOption<T>[] {
  return entries.map(([id, name, description, background, surface, accent, text]) => ({
    id,
    name,
    mode,
    description,
    previewColors: { background, surface, accent, text },
  }));
}

export const LIGHT_THEMES: LightThemeOption[] = buildThemes('light', [
  [
    'vanilla',
    'Namalsk Day',
    'Crisp sub-arctic slate daylight with Aegis Royal Blue accents.',
    '#f0f4f8',
    '#ffffff',
    '#3366d6',
    '#1d3048',
  ],
  [
    'frostline-light',
    'Frostline Day',
    'Glacial ice-mist surfaces with sharp arctic teal-cyan accents.',
    '#e3f0f5',
    '#ffffff',
    '#0e7490',
    '#0f2936',
  ],
  [
    'chernarus-light',
    'Chernarus Overcast',
    'Zero-chroma overcast stone palette with crisp carbon ink controls.',
    '#ebebea',
    '#ffffff',
    '#27272a',
    '#18181b',
  ],
  [
    'livonia-light',
    'Livonia Clearing',
    'Misty boreal sage surfaces paired with tactical pine-emerald.',
    '#e9ede7',
    '#ffffff',
    '#2d6a4f',
    '#1a2920',
  ],
  [
    'badlands-light',
    'Badlands Sun',
    'Sun-baked desert sandstone surfaces with rich burnt ochre accents.',
    '#f3eadc',
    '#ffffff',
    '#b45309',
    '#332415',
  ],
  [
    'krasno-light',
    'Krasno Dawn',
    'Warm blush-alabaster backdrop with high-contrast crimson-ruby accents.',
    '#f5e9ec',
    '#ffffff',
    '#9d174d',
    '#361822',
  ],
]);

export const DARK_THEMES: DarkThemeOption[] = buildThemes('dark', [
  [
    'obsidian',
    'Namalsk Night',
    'Deep polar obsidian panels paired with tactical cobalt blue accents.',
    '#090d12',
    '#101620',
    '#558bf2',
    '#f1f5f9',
  ],
  [
    'frostline-dark',
    'Sakhal Night',
    'Abyssal glacial sea surfaces lit by crisp frost-teal telemetry.',
    '#081318',
    '#11242d',
    '#2dd4bf',
    '#e6f4f8',
  ],
  [
    'chernarus-dark',
    'Tisy Bunker',
    'Pure monochromatic bunker carbon with high-contrast steel accents.',
    '#111112',
    '#1d1d20',
    '#e4e4e7',
    '#f4f4f5',
  ],
  [
    'livonia-dark',
    'Nadbor Pine',
    'Deep woodland charcoal with forest moss-emerald highlights.',
    '#0f1410',
    '#1a221c',
    '#52b788',
    '#e9f2eb',
  ],
  [
    'badlands-dark',
    'Badlands Dusk',
    'Warm desert espresso surfaces glowing with golden amber highlights.',
    '#16100b',
    '#251b13',
    '#f59e0b',
    '#f7ede2',
  ],
  [
    'krasno-dark',
    'Signal Flare',
    'Dark cinder surfaces illuminated by warm crimson-rose road flares.',
    '#170e12',
    '#26171d',
    '#f472b6',
    '#faeef2',
  ],
]);

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
