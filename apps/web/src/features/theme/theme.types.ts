import { z } from 'zod';

export const themeModeSchema = z.enum(['light', 'dark']);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const lightThemeIdSchema = z.enum([
  'vanilla',
  'frostline-light',
  'chernarus-light',
  'livonia-light',
  'badlands-light',
  'krasno-light',
]);
export type LightThemeId = z.infer<typeof lightThemeIdSchema>;

export const darkThemeIdSchema = z.enum([
  'obsidian',
  'frostline-dark',
  'chernarus-dark',
  'livonia-dark',
  'badlands-dark',
  'krasno-dark',
]);
export type DarkThemeId = z.infer<typeof darkThemeIdSchema>;

export type ThemeId = LightThemeId | DarkThemeId;

const LEGACY_LIGHT_THEME_MAP: Record<string, LightThemeId> = {
  light: 'vanilla',
  'darcula-light': 'vanilla',
  'tokyo-light': 'frostline-light',
  'graphite-light': 'chernarus-light',
  'catppuccin-latte': 'livonia-light',
};

const LEGACY_DARK_THEME_MAP: Record<string, DarkThemeId> = {
  dark: 'obsidian',
  darcula: 'obsidian',
  tokyo: 'frostline-dark',
  graphite: 'chernarus-dark',
  catppuccin: 'livonia-dark',
};

export const themeSettingsSchema = z.preprocess(
  (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return raw;
    const obj = raw as Record<string, unknown>;
    const rawLight = obj.preferredLight ?? obj.prefferedLight;
    const rawDark = obj.preferredDark ?? obj.prefferedDark;
    const resolvedLight =
      typeof rawLight === 'string' ? (LEGACY_LIGHT_THEME_MAP[rawLight] ?? rawLight) : 'vanilla';
    const resolvedDark =
      typeof rawDark === 'string' ? (LEGACY_DARK_THEME_MAP[rawDark] ?? rawDark) : 'obsidian';
    return {
      mode: obj.mode ?? 'light',
      preferredLight: resolvedLight,
      preferredDark: resolvedDark,
    };
  },
  z.object({
    mode: themeModeSchema.default('light'),
    preferredLight: lightThemeIdSchema.default('vanilla'),
    preferredDark: darkThemeIdSchema.default('obsidian'),
  }),
);
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;

export interface ThemeContextValue {
  mode: ThemeMode;
  activeThemeId: ThemeId;
  preferredLight?: LightThemeId;
  preferredDark?: DarkThemeId;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  setPreferredDark: (theme: DarkThemeId) => void;
  setPreferredLight: (theme: LightThemeId) => void;
}
