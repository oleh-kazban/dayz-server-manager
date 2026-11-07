import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as themePrefModule from '../hooks/useThemePreference';

import { ThemeSelectorCard } from './ThemeSelectorCard';

describe('ThemeSelectorCard', () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(themePrefModule, 'useThemePreference').mockReturnValue({
      currentThemeId: 'obsidian',
      setTheme: mockSetTheme,
      themes: themePrefModule.AVAILABLE_THEMES,
    });
  });

  it('renders title and all available themes', () => {
    render(<ThemeSelectorCard />);

    expect(screen.getByText('Visual Appearance & Theme')).toBeInTheDocument();
    expect(screen.getByText('Vanilla Light')).toBeInTheDocument();
    expect(screen.getByText('Obsidian Default')).toBeInTheDocument();
    expect(screen.getByText('Darcula Classic')).toBeInTheDocument();
    expect(screen.getByText('Graphite Stealth')).toBeInTheDocument();
    expect(screen.getByText('Tokyo Night')).toBeInTheDocument();
    expect(screen.getByText('Catppuccin Macchiato')).toBeInTheDocument();
  });

  it('triggers setTheme when a theme button is clicked', () => {
    render(<ThemeSelectorCard />);

    const tokyoButton = screen.getByText('Tokyo Night').closest('button');
    expect(tokyoButton).toBeDefined();

    fireEvent.click(tokyoButton!);
    expect(mockSetTheme).toHaveBeenCalledWith('tokyo');
  });

  it('switches to light theme when clicking Vanilla Light', () => {
    render(<ThemeSelectorCard />);

    const vanillaButton = screen.getByText('Vanilla Light').closest('button');
    expect(vanillaButton).toBeDefined();

    fireEvent.click(vanillaButton!);
    expect(mockSetTheme).toHaveBeenCalledWith('vanilla');
  });
});
