import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { localStorageDriver } from '@dsm/core/storage';

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
    expect(screen.getByTestId('active')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
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
    expect(screen.getByTestId('active')).toHaveTextContent('darcula');
    expect(document.documentElement.getAttribute('data-theme')).toBe('darcula');

    act(() => {
      screen.getByRole('button', { name: 'Toggle' }).click();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('active')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('allows setting mode, preferredDark, and preferredLight explicitly', () => {
    function Consumer() {
      const { mode, setMode, setPreferredDark, setPreferredLight } = useTheme();
      return (
        <div>
          <span data-testid="mode">{mode}</span>
          <button type="button" onClick={() => setMode('dark')}>
            Set Dark
          </button>
          <button type="button" onClick={() => setPreferredDark('darcula')}>
            Set Darcula
          </button>
          <button type="button" onClick={() => setPreferredLight('light')}>
            Set Light
          </button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Set Dark' }).click();
      screen.getByRole('button', { name: 'Set Darcula' }).click();
      screen.getByRole('button', { name: 'Set Light' }).click();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
  });

  it('loads existing settings from localStorage', () => {
    localStorageDriver.set(THEME_STORAGE_KEY, {
      mode: 'dark',
      preferredLight: 'light',
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
});
