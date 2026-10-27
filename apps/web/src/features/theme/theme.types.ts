import { z } from 'zod';

export const themeModeSchema = z.enum(['light', 'dark']);
export type ThemeMode = z.infer<typeof themeModeSchema>;

export const lightThemeIdSchema = z.enum(['light']);
export type LightThemeId = z.infer<typeof lightThemeIdSchema>;

export const darkThemeIdSchema = z.enum(['dark', 'darcula', 'graphite', 'tokyo', 'catppuccin']);
export type DarkThemeId = z.infer<typeof darkThemeIdSchema>;

export type ThemeId = LightThemeId | DarkThemeId;

export const themeSettingsSchema = z.object({
  mode: themeModeSchema,
  preferredLight: lightThemeIdSchema,
  preferredDark: darkThemeIdSchema,
});
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;

export interface ThemeContextValue {
  mode: ThemeMode;
  activeThemeId: ThemeId;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  setPreferredDark: (theme: DarkThemeId) => void;
  setPreferredLight: (theme: LightThemeId) => void;
}
