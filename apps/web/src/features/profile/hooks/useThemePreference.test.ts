import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as themeModule from '../../theme';

import { useThemePreference } from './useThemePreference';

describe('useThemePreference', () => {
  const mockSetMode = vi.fn();
  const mockSetPreferredLight = vi.fn();
  const mockSetPreferredDark = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');

    vi.spyOn(themeModule, 'useTheme').mockReturnValue({
      mode: 'dark',
      activeThemeId: 'obsidian',
      toggleTheme: vi.fn(),
      setMode: mockSetMode,
      setPreferredLight: mockSetPreferredLight,
      setPreferredDark: mockSetPreferredDark,
    });
  });

  it('provides currentThemeId and AVAILABLE_THEMES list', () => {
    const { result } = renderHook(() => useThemePreference());

    expect(result.current.currentThemeId).toBe('obsidian');
    expect(result.current.themes).toHaveLength(6);
    expect(result.current.themes.map(t => t.id)).toEqual([
      'vanilla',
      'obsidian',
      'darcula',
      'graphite',
      'tokyo',
      'catppuccin',
    ]);
  });

  it('falls back to obsidian when activeThemeId is undefined', () => {
    vi.spyOn(themeModule, 'useTheme').mockReturnValue({
      mode: 'dark',
      activeThemeId: undefined as unknown as 'obsidian',
      toggleTheme: vi.fn(),
      setMode: mockSetMode,
      setPreferredLight: mockSetPreferredLight,
      setPreferredDark: mockSetPreferredDark,
    });

    const { result } = renderHook(() => useThemePreference());
    expect(result.current.currentThemeId).toBe('obsidian');
  });

  it('switches to light mode when selecting vanilla', () => {
    const { result } = renderHook(() => useThemePreference());

    act(() => {
      result.current.setTheme('vanilla');
    });

    expect(mockSetMode).toHaveBeenCalledWith('light');
    expect(mockSetPreferredLight).toHaveBeenCalledWith('vanilla');
    expect(document.documentElement.getAttribute('data-theme')).toBe('vanilla');
    expect(localStorage.getItem('dsm-theme-preference')).toBe('vanilla');
  });

  it('switches to dark mode and sets dark palette when selecting tokyo', () => {
    const { result } = renderHook(() => useThemePreference());

    act(() => {
      result.current.setTheme('tokyo');
    });

    expect(mockSetMode).toHaveBeenCalledWith('dark');
    expect(mockSetPreferredDark).toHaveBeenCalledWith('tokyo');
    expect(document.documentElement.getAttribute('data-theme')).toBe('tokyo');
    expect(localStorage.getItem('dsm-theme-preference')).toBe('tokyo');
  });

  it('handles localStorage throwing errors gracefully without crashing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const { result } = renderHook(() => useThemePreference());

    expect(() => {
      act(() => {
        result.current.setTheme('darcula');
      });
    }).not.toThrow();

    expect(mockSetMode).toHaveBeenCalledWith('dark');
    expect(mockSetPreferredDark).toHaveBeenCalledWith('darcula');
  });
});
