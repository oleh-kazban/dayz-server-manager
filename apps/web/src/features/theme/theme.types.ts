export type ThemeMode = 'light' | 'dark';

export type LightThemeId = 'light';
export type DarkThemeId = 'dark' | 'darcula' | 'graphite' | 'tokyo' | 'catppuccin';

export type ThemeId = LightThemeId | DarkThemeId;

export interface ThemeSettings {
  mode: ThemeMode;
  prefferedLight: LightThemeId;
  prefferedDark: DarkThemeId;
}

export interface ThemeContextValue {
  mode: ThemeMode;
  activeThemeId: ThemeId;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  setPrefferedDark: (theme: DarkThemeId) => void;
  setPrefferedLight: (theme: LightThemeId) => void;
}
