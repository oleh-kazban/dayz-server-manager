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
    expect(screen.getByText('Active')).toBeInTheDocument();

    expect(screen.getByText('Preferred Light Theme')).toBeInTheDocument();
    expect(screen.getByText('Preferred Dark Theme')).toBeInTheDocument();

    // Verify all 6 light themes exist
    expect(screen.getByText('Namalsk Day')).toBeInTheDocument();
    expect(screen.getByText('Frostline Day')).toBeInTheDocument();
    expect(screen.getByText('Chernarus Overcast')).toBeInTheDocument();
    expect(screen.getByText('Livonia Clearing')).toBeInTheDocument();
    expect(screen.getByText('Badlands Sun')).toBeInTheDocument();
    expect(screen.getByText('Krasno Dawn')).toBeInTheDocument();

    // Verify all 6 dark themes exist
    expect(screen.getByText('Namalsk Night')).toBeInTheDocument();
    expect(screen.getByText('Sakhal Night')).toBeInTheDocument();
    expect(screen.getByText('Tisy Bunker')).toBeInTheDocument();
    expect(screen.getByText('Nadbor Pine')).toBeInTheDocument();
    expect(screen.getByText('Badlands Dusk')).toBeInTheDocument();
    expect(screen.getByText('Signal Flare')).toBeInTheDocument();
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
    expect(screen.getByText('Active')).toBeInTheDocument();
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

    const frostlineBtn = screen.getByText('Frostline Day').closest('button');
    expect(frostlineBtn).toBeDefined();

    fireEvent.click(frostlineBtn!);

    expect(mockSetPreferredLight).toHaveBeenCalledWith('frostline-light');
    expect(mockSetTheme).toHaveBeenCalledWith('frostline-light');
  });

  it('selects a preferred dark theme and triggers setters', () => {
    render(<ThemeSelectorCard />);

    const badlandsBtn = screen.getByText('Badlands Dusk').closest('button');
    expect(badlandsBtn).toBeDefined();

    fireEvent.click(badlandsBtn!);

    expect(mockSetPreferredDark).toHaveBeenCalledWith('badlands-dark');
    expect(mockSetTheme).toHaveBeenCalledWith('badlands-dark');
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

    const namalskDayBtn = screen.getByText('Namalsk Day').closest('button');
    const namalskNightBtn = screen.getByText('Namalsk Night').closest('button');
    const darkModeBtn = screen.getByRole('button', { name: 'Dark Mode' });

    expect(() => {
      fireEvent.click(namalskDayBtn!);
      fireEvent.click(namalskNightBtn!);
      fireEvent.click(darkModeBtn);
    }).not.toThrow();
  });
});
