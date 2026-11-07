import { z } from 'zod';

export const themeModeSchema = z.enum(['light', 'dark']);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const lightThemeIdSchema = z.enum([
  'vanilla',
  'darcula-light',
  'graphite-light',
  'tokyo-light',
  'catppuccin-latte',
]);
export type LightThemeId = z.infer<typeof lightThemeIdSchema>;

export const darkThemeIdSchema = z.enum(['obsidian', 'darcula', 'graphite', 'tokyo', 'catppuccin']);
export type DarkThemeId = z.infer<typeof darkThemeIdSchema>;

export type ThemeId = LightThemeId | DarkThemeId;

export const themeSettingsSchema = z.preprocess(
  (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return raw;
    const obj = raw as Record<string, unknown>;
    const rawLight = obj.preferredLight ?? obj.prefferedLight;
    const rawDark = obj.preferredDark ?? obj.prefferedDark;
    return {
      mode: obj.mode ?? 'light',
      preferredLight: rawLight === 'light' ? 'vanilla' : (rawLight ?? 'vanilla'),
      preferredDark: rawDark === 'dark' ? 'obsidian' : (rawDark ?? 'obsidian'),
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
