import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as themePrefModule from '../hooks/useThemePreference';

import { ThemeSelectorCard } from './ThemeSelectorCard';

describe('ThemeSelectorCard', () => {
  const mockSetMode = vi.fn();
  const mockSetTheme = vi.fn();
  const mockSetPreferredLight = vi.fn();
  const mockSetPreferredDark = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(themePrefModule, 'useThemePreference').mockReturnValue({
      mode: 'light',
      activeThemeId: 'vanilla',
      preferredLight: 'vanilla',
      preferredDark: 'obsidian',
      currentThemeId: 'vanilla',
      themes: themePrefModule.AVAILABLE_THEMES,
      lightThemes: themePrefModule.LIGHT_THEMES,
      darkThemes: themePrefModule.DARK_THEMES,
      setMode: mockSetMode,
      setTheme: mockSetTheme,
      setPreferredLight: mockSetPreferredLight,
      setPreferredDark: mockSetPreferredDark,
    });
  });

  it('renders card title, active mode banner, and both theme sections in light mode', () => {
    render(<ThemeSelectorCard />);

    expect(screen.getByText('Visual Appearance & Theme')).toBeInTheDocument();
    expect(screen.getByText('Active Mode: Light Mode')).toBeInTheDocument();
    expect(screen.getByText('☀️ Active')).toBeInTheDocument();

    expect(screen.getByText('Preferred Light Theme')).toBeInTheDocument();
    expect(screen.getByText('Preferred Dark Theme')).toBeInTheDocument();

    // Verify all 5 light themes exist
    expect(screen.getByText('Vanilla Light')).toBeInTheDocument();
    expect(screen.getByText('Darcula Light')).toBeInTheDocument();
    expect(screen.getByText('Graphite Light')).toBeInTheDocument();
    expect(screen.getByText('Tokyo Day')).toBeInTheDocument();
    expect(screen.getByText('Catppuccin Latte')).toBeInTheDocument();

    // Verify all 5 dark themes exist
    expect(screen.getByText('Obsidian Default')).toBeInTheDocument();
    expect(screen.getByText('Darcula Classic')).toBeInTheDocument();
    expect(screen.getByText('Graphite Stealth')).toBeInTheDocument();
    expect(screen.getByText('Tokyo Night')).toBeInTheDocument();
    expect(screen.getByText('Catppuccin Macchiato')).toBeInTheDocument();
  });

  it('renders dark mode banner when active mode is dark', () => {
    vi.spyOn(themePrefModule, 'useThemePreference').mockReturnValue({
      mode: 'dark',
      activeThemeId: 'obsidian',
      preferredLight: 'vanilla',
      preferredDark: 'obsidian',
      currentThemeId: 'obsidian',
      themes: themePrefModule.AVAILABLE_THEMES,
      lightThemes: themePrefModule.LIGHT_THEMES,
      darkThemes: themePrefModule.DARK_THEMES,
      setMode: mockSetMode,
      setTheme: mockSetTheme,
      setPreferredLight: mockSetPreferredLight,
      setPreferredDark: mockSetPreferredDark,
    });

    render(<ThemeSelectorCard />);

    expect(screen.getByText('Active Mode: Dark Mode')).toBeInTheDocument();
    expect(screen.getByText('🌙 Active')).toBeInTheDocument();
  });

  it('switches mode when clicking Light Mode or Dark Mode buttons in banner', () => {
    render(<ThemeSelectorCard />);

    const lightModeBtn = screen.getByRole('button', { name: 'Light Mode' });
    const darkModeBtn = screen.getByRole('button', { name: 'Dark Mode' });

    fireEvent.click(darkModeBtn);
    expect(mockSetMode).toHaveBeenCalledWith('dark');

    fireEvent.click(lightModeBtn);
    expect(mockSetMode).toHaveBeenCalledWith('light');
  });

  it('selects a preferred light theme and triggers setters', () => {
    render(<ThemeSelectorCard />);

    const tokyoDayBtn = screen.getByText('Tokyo Day').closest('button');
    expect(tokyoDayBtn).toBeDefined();

    fireEvent.click(tokyoDayBtn!);

    expect(mockSetPreferredLight).toHaveBeenCalledWith('tokyo-light');
    expect(mockSetTheme).toHaveBeenCalledWith('tokyo-light');
  });

  it('selects a preferred dark theme and triggers setters', () => {
    render(<ThemeSelectorCard />);

    const tokyoNightBtn = screen.getByText('Tokyo Night').closest('button');
    expect(tokyoNightBtn).toBeDefined();

    fireEvent.click(tokyoNightBtn!);

    expect(mockSetPreferredDark).toHaveBeenCalledWith('tokyo');
    expect(mockSetTheme).toHaveBeenCalledWith('tokyo');
  });

  it('handles empty/undefined theme preference values gracefully', () => {
    vi.spyOn(themePrefModule, 'useThemePreference').mockReturnValue({
      mode: undefined,
      activeThemeId: undefined as unknown as 'vanilla',
      preferredLight: undefined,
      preferredDark: undefined,
      currentThemeId: undefined as unknown as 'vanilla',
      themes: [],
      lightThemes: undefined,
      darkThemes: undefined,
      setMode: undefined,
      setTheme: undefined as unknown as (t: string) => void,
      setPreferredLight: undefined,
      setPreferredDark: undefined,
    });

    render(<ThemeSelectorCard />);

    expect(screen.getByText('Active Mode: Light Mode')).toBeInTheDocument();

    const vanillaBtn = screen.getByText('Vanilla Light').closest('button');
    const obsidianBtn = screen.getByText('Obsidian Default').closest('button');
    const darkModeBtn = screen.getByRole('button', { name: 'Dark Mode' });

    expect(() => {
      fireEvent.click(vanillaBtn!);
      fireEvent.click(obsidianBtn!);
      fireEvent.click(darkModeBtn);
    }).not.toThrow();
  });
});
