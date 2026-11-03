import { z } from 'zod';

export const themeModeSchema = z.enum(['light', 'dark']);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const lightThemeIdSchema = z.enum(['light']);
export type LightThemeId = z.infer<typeof lightThemeIdSchema>;

export const darkThemeIdSchema = z.enum(['dark', 'darcula', 'graphite', 'tokyo', 'catppuccin']);
export type DarkThemeId = z.infer<typeof darkThemeIdSchema>;

export type ThemeId = LightThemeId | DarkThemeId;

export const themeSettingsSchema = z.preprocess(
  (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return raw;
    const obj = raw as Record<string, unknown>;
    return {
      mode: obj.mode ?? 'light',
      preferredLight: obj.preferredLight ?? obj.prefferedLight ?? 'light',
      preferredDark: obj.preferredDark ?? obj.prefferedDark ?? 'darcula',
    };
  },
  z.object({
    mode: themeModeSchema.default('light'),
    preferredLight: lightThemeIdSchema.default('light'),
    preferredDark: darkThemeIdSchema.default('darcula'),
  }),
);
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;

export interface ThemeContextValue {
  mode: ThemeMode;
  activeThemeId: ThemeId;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  setPreferredDark: (theme: DarkThemeId) => void;
  setPreferredLight: (theme: LightThemeId) => void;
}
