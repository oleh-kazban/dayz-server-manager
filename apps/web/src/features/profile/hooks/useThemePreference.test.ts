import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ThemeContextValue } from '../../theme';
import * as themeModule from '../../theme';

import {
  AVAILABLE_THEMES,
  DARK_THEMES,
  LIGHT_THEMES,
  useThemePreference,
} from './useThemePreference';

describe('useThemePreference', () => {
  const mockSetMode = vi.fn();
  const mockToggleTheme = vi.fn();
  const mockSetPreferredLight = vi.fn();
  const mockSetPreferredDark = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(themeModule, 'useTheme').mockReturnValue({
      mode: 'dark',
      activeThemeId: 'obsidian',
      preferredLight: 'vanilla',
      preferredDark: 'obsidian',
      toggleTheme: mockToggleTheme,
      setMode: mockSetMode,
      setPreferredLight: mockSetPreferredLight,
      setPreferredDark: mockSetPreferredDark,
    });
  });

  it('provides lightThemes, darkThemes, and combined themes list with expected counts', () => {
    const { result } = renderHook(() => useThemePreference());

    expect(result.current.lightThemes).toHaveLength(5);
    expect(result.current.darkThemes).toHaveLength(5);
    expect(result.current.themes).toHaveLength(10);

    expect(result.current.lightThemes).toEqual(LIGHT_THEMES);
    expect(result.current.darkThemes).toEqual(DARK_THEMES);
    expect(result.current.themes).toEqual(AVAILABLE_THEMES);
  });

  it('exposes current state values from theme context', () => {
    const { result } = renderHook(() => useThemePreference());

    expect(result.current.mode).toBe('dark');
    expect(result.current.activeThemeId).toBe('obsidian');
    expect(result.current.currentThemeId).toBe('obsidian');
    expect(result.current.preferredLight).toBe('vanilla');
    expect(result.current.preferredDark).toBe('obsidian');
  });

  it('defaults preferredLight and preferredDark to vanilla and obsidian if omitted', () => {
    vi.spyOn(themeModule, 'useTheme').mockReturnValue({
      mode: 'light',
      activeThemeId: 'vanilla',
      preferredLight: undefined,
      preferredDark: undefined,
      toggleTheme: mockToggleTheme,
      setMode: mockSetMode,
      setPreferredLight: mockSetPreferredLight,
      setPreferredDark: mockSetPreferredDark,
    });

    const { result } = renderHook(() => useThemePreference());

    expect(result.current.preferredLight).toBe('vanilla');
    expect(result.current.preferredDark).toBe('obsidian');
  });

  it('calls setPreferredLight and sets mode to light when setTheme is called with a light theme', () => {
    const { result } = renderHook(() => useThemePreference());

    act(() => {
      result.current.setTheme('tokyo-light');
    });

    expect(mockSetPreferredLight).toHaveBeenCalledWith('tokyo-light');
    expect(mockSetMode).toHaveBeenCalledWith('light');
    expect(mockSetPreferredDark).not.toHaveBeenCalled();
  });

  it('calls setPreferredDark and sets mode to dark when setTheme is called with a dark theme', () => {
    const { result } = renderHook(() => useThemePreference());

    act(() => {
      result.current.setTheme('catppuccin');
    });

    expect(mockSetPreferredDark).toHaveBeenCalledWith('catppuccin');
    expect(mockSetMode).toHaveBeenCalledWith('dark');
    expect(mockSetPreferredLight).not.toHaveBeenCalled();
  });

  it('handles optional functions gracefully when setTheme is called without setters in context', () => {
    vi.spyOn(themeModule, 'useTheme').mockReturnValue({
      mode: 'light',
      activeThemeId: 'vanilla',
      preferredLight: 'vanilla',
      preferredDark: 'obsidian',
      toggleTheme: undefined as unknown as () => void,
      setMode: undefined as unknown as () => void,
      setPreferredLight: undefined as unknown as () => void,
      setPreferredDark: undefined as unknown as () => void,
    } as unknown as ThemeContextValue);

    const { result } = renderHook(() => useThemePreference());

    expect(() => {
      act(() => {
        result.current.setTheme('graphite-light');
        result.current.setTheme('graphite');
      });
    }).not.toThrow();
  });
});
