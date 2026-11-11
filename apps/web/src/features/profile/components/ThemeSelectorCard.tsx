import { Check, Moon, Sun } from 'lucide-react';

import { Card, Tag } from '@aegis/ui';

import {
  DARK_THEMES,
  type DarkThemeOption,
  LIGHT_THEMES,
  type LightThemeOption,
  useThemePreference,
} from '../hooks/useThemePreference';

type GenericThemeOption = LightThemeOption | DarkThemeOption;

interface ThemePaletteGridProps<T extends GenericThemeOption> {
  themes: readonly T[];
  selectedThemeId: string;
  isCurrentModeActive: boolean;
  currentThemeId: string;
  onSelect: (theme: T) => void;
}

function ThemePaletteGrid<T extends GenericThemeOption>({
  themes,
  selectedThemeId,
  isCurrentModeActive,
  currentThemeId,
  onSelect,
}: ThemePaletteGridProps<T>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
      {themes.map(theme => {
        const isSelected =
          selectedThemeId === theme.id || (isCurrentModeActive && currentThemeId === theme.id);

        return (
          <button
            key={theme.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(theme)}
            className={`relative flex flex-col text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
              isSelected
                ? 'border-[var(--color-primary)] bg-[var(--color-surface-hover)] shadow-sm'
                : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="font-semibold text-sm text-[var(--color-text-main)] truncate">
                {theme.name}
              </span>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg,#ffffff)] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>

            <p className="text-xs text-[var(--color-text-muted)] mb-3 flex-1 line-clamp-2">
              {theme.description}
            </p>

            <div
              className="w-full h-7 rounded-lg overflow-hidden flex border border-black/10 shadow-inner"
              style={{ backgroundColor: theme.previewColors.background }}
            >
              <div
                className="w-1/3 h-full flex items-center justify-center text-[10px] font-mono font-bold"
                style={{
                  backgroundColor: theme.previewColors.surface,
                  color: theme.previewColors.text,
                }}
              >
                Aa
              </div>
              <div
                className="w-1/3 h-full"
                style={{ backgroundColor: theme.previewColors.background }}
              />
              <div
                className="w-1/3 h-full flex items-center justify-center"
                style={{ backgroundColor: theme.previewColors.accent }}
              >
                <div className="w-2 h-2 rounded-full bg-white/80" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeSelectorCard() {
  const themePref = useThemePreference();
  const mode = themePref.mode ?? 'light';
  const preferredLight = themePref.preferredLight ?? 'vanilla';
  const preferredDark = themePref.preferredDark ?? 'obsidian';
  const lightThemes = themePref.lightThemes ?? LIGHT_THEMES;
  const darkThemes = themePref.darkThemes ?? DARK_THEMES;

  const handleSelectLight = (theme: LightThemeOption) => {
    themePref.setPreferredLight?.(theme.id);
    themePref.setTheme?.(theme.id);
  };

  const handleSelectDark = (theme: DarkThemeOption) => {
    themePref.setPreferredDark?.(theme.id);
    themePref.setTheme?.(theme.id);
  };

  return (
    <Card
      title="Visual Appearance & Theme"
      subtitle="Pair your preferred light and dark themes. The header toggle button flips between your chosen selections."
    >
      <div className="space-y-6">
        {/* Active Mode Switcher / Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shrink-0">
              {mode === 'light' ? (
                <Sun className="w-5 h-5 text-[var(--color-status-warning)]" />
              ) : (
                <Moon className="w-5 h-5 text-[var(--color-primary)]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[var(--color-text-main)]">
                  Active Mode: {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
                </span>
                <Tag color={mode === 'light' ? 'amber' : 'purple'} variant="subtle">
                  Active
                </Tag>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                The header toggle button flips between your selected light and dark themes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => themePref.setMode?.('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                mode === 'light'
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg,#ffffff)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              onClick={() => themePref.setMode?.('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                mode === 'dark'
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg,#ffffff)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark Mode</span>
            </button>
          </div>
        </div>

        {/* Section 1: Preferred Light Theme */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-[var(--color-status-warning)]" />
              <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
                Preferred Light Theme
              </h3>
              {mode === 'light' && (
                <Tag color="amber" variant="subtle">
                  Active Now
                </Tag>
              )}
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              Applied when DayZ Server Manager is in light mode
            </span>
          </div>

          <ThemePaletteGrid
            themes={lightThemes}
            selectedThemeId={preferredLight}
            isCurrentModeActive={mode === 'light'}
            currentThemeId={themePref.currentThemeId ?? ''}
            onSelect={handleSelectLight}
          />
        </div>

        {/* Section 2: Preferred Dark Theme */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-[var(--color-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--color-text-main)]">
                Preferred Dark Theme
              </h3>
              {mode === 'dark' && (
                <Tag color="purple" variant="subtle">
                  Active Now
                </Tag>
              )}
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              Applied when DayZ Server Manager is in dark mode
            </span>
          </div>

          <ThemePaletteGrid
            themes={darkThemes}
            selectedThemeId={preferredDark}
            isCurrentModeActive={mode === 'dark'}
            currentThemeId={themePref.currentThemeId ?? ''}
            onSelect={handleSelectDark}
          />
        </div>
      </div>
    </Card>
  );
}
