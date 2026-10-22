export type ThemeMode = 'light' | 'dark';

export type LightThemeId = 'light';
export type DarkThemeId = 'dark' | 'darcula' | 'graphite' | 'tokyo' | 'catppuccin';

export type ThemeId = LightThemeId | DarkThemeId;

export interface ThemeSettings {
  mode: ThemeMode;
  preferredLight: LightThemeId;
  preferredDark: DarkThemeId;
}

export interface ThemeContextValue {
  mode: ThemeMode;
  activeThemeId: ThemeId;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  setPreferredDark: (theme: DarkThemeId) => void;
  setPreferredLight: (theme: LightThemeId) => void;
}
