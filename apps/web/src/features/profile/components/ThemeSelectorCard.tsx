import { Check, Moon, Sun } from 'lucide-react';

import { Card, Tag } from '@dsm/ui';

import { type ThemeOption, useThemePreference } from '../hooks/useThemePreference';

export function ThemeSelectorCard() {
  const { currentThemeId, setTheme, themes } = useThemePreference();

  return (
    <Card
      title="Visual Appearance & Theme"
      subtitle="Client-side visual customization strictly persisted to your local device browser."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme: ThemeOption) => {
          const isSelected = currentThemeId === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setTheme(theme.id)}
              className={`relative flex flex-col text-left p-4 rounded-xl border-2 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-surface-hover)] shadow-md'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="flex items-center gap-2">
                  {theme.mode === 'light' ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  )}
                  <span className="font-semibold text-sm text-[var(--color-text-main)]">
                    {theme.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Tag color={theme.mode === 'light' ? 'amber' : 'gray'} variant="subtle">
                    {theme.mode.toUpperCase()}
                  </Tag>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-contrast)] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-[var(--color-text-muted)] mb-4 flex-1">
                {theme.description}
              </p>

              {/* Swatch visual preview bar */}
              <div
                className="w-full h-8 rounded-lg overflow-hidden flex border border-black/10 shadow-inner"
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
    </Card>
  );
}
