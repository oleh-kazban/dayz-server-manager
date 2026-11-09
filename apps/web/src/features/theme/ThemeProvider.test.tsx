import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { localStorageDriver } from '@aegis/web/core/storage';

import { THEME_STORAGE_KEY, useTheme } from './theme.context';
import { ThemeProvider } from './ThemeProvider';

describe('ThemeProvider & useTheme', () => {
  beforeEach(() => {
    localStorageDriver.remove(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  it('throws when useTheme is called outside ThemeProvider', () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a <ThemeProvider />');
  });

  it('provides default light theme settings and sets data-theme attribute on root', () => {
    function Consumer() {
      const { mode, activeThemeId } = useTheme();
      return (
        <div>
          <span data-testid="mode">{mode}</span>
          <span data-testid="active">{activeThemeId}</span>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('active')).toHaveTextContent('vanilla');
    expect(document.documentElement.getAttribute('data-theme')).toBe('vanilla');
  });

  it('toggles mode between light and dark and updates document attribute', () => {
    function Consumer() {
      const { mode, activeThemeId, toggleTheme } = useTheme();
      return (
        <div>
          <span data-testid="mode">{mode}</span>
          <span data-testid="active">{activeThemeId}</span>
          <button type="button" onClick={toggleTheme}>
            Toggle
          </button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('light');

    act(() => {
      screen.getByRole('button', { name: 'Toggle' }).click();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('active')).toHaveTextContent('obsidian');
    expect(document.documentElement.getAttribute('data-theme')).toBe('obsidian');

    act(() => {
      screen.getByRole('button', { name: 'Toggle' }).click();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('active')).toHaveTextContent('vanilla');
    expect(document.documentElement.getAttribute('data-theme')).toBe('vanilla');
  });

  it('allows setting mode, preferredDark, and preferredLight explicitly across all supported palettes', () => {
    function Consumer() {
      const {
        mode,
        activeThemeId,
        preferredLight,
        preferredDark,
        setMode,
        setPreferredDark,
        setPreferredLight,
      } = useTheme();
      return (
        <div>
          <span data-testid="mode">{mode}</span>
          <span data-testid="active">{activeThemeId}</span>
          <span data-testid="pref-light">{preferredLight}</span>
          <span data-testid="pref-dark">{preferredDark}</span>
          <button type="button" onClick={() => setMode('dark')}>
            Set Dark
          </button>
          <button type="button" onClick={() => setMode('light')}>
            Set Light
          </button>
          <button type="button" onClick={() => setPreferredDark('catppuccin')}>
            Set Catppuccin
          </button>
          <button type="button" onClick={() => setPreferredLight('tokyo-light')}>
            Set Tokyo Day
          </button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('pref-light')).toHaveTextContent('vanilla');
    expect(screen.getByTestId('pref-dark')).toHaveTextContent('obsidian');

    act(() => {
      screen.getByRole('button', { name: 'Set Tokyo Day' }).click();
    });

    expect(screen.getByTestId('pref-light')).toHaveTextContent('tokyo-light');
    expect(screen.getByTestId('active')).toHaveTextContent('tokyo-light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('tokyo-light');

    act(() => {
      screen.getByRole('button', { name: 'Set Dark' }).click();
      screen.getByRole('button', { name: 'Set Catppuccin' }).click();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('pref-dark')).toHaveTextContent('catppuccin');
    expect(screen.getByTestId('active')).toHaveTextContent('catppuccin');
    expect(document.documentElement.getAttribute('data-theme')).toBe('catppuccin');
  });

  it('loads existing settings from localStorage', () => {
    localStorageDriver.set(THEME_STORAGE_KEY, {
      mode: 'dark',
      preferredLight: 'vanilla',
      preferredDark: 'darcula',
    });

    function Consumer() {
      const { mode } = useTheme();
      return <span data-testid="mode">{mode}</span>;
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('safely migrates legacy light / dark theme IDs to vanilla / obsidian', () => {
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({
        mode: 'dark',
        preferredLight: 'light',
        preferredDark: 'dark',
      }),
    );

    function MigrationConsumer() {
      const { mode, activeThemeId } = useTheme();
      return <div data-testid="migrated">{`${mode}:${activeThemeId}`}</div>;
    }

    render(
      <ThemeProvider>
        <MigrationConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('migrated')).toHaveTextContent('dark:obsidian');
  });

  it('safely migrates legacy prefferedDark / prefferedLight keys and partial storage', () => {
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({
        mode: 'dark',
        prefferedDark: 'tokyo',
      }),
    );

    function LegacyConsumer() {
      const { mode, activeThemeId } = useTheme();
      return <div data-testid="legacy-theme-values">{`${mode}:${activeThemeId}`}</div>;
    }

    render(
      <ThemeProvider>
        <LegacyConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('legacy-theme-values')).toHaveTextContent('dark:tokyo');
  });
});
