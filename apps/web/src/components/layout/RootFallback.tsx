import type { ErrorComponentProps } from '@tanstack/react-router';

export function RootLoader() {
  return (
    <div
      data-testid="root-loader"
      className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)]"
    >
      <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
    </div>
  );
}

export interface RootErrorFallbackProps extends Partial<ErrorComponentProps> {
  error?: unknown;
}

export function RootErrorFallback({ error, reset }: RootErrorFallbackProps) {
  const errorMessage =
    error instanceof Error
      ? error.message
      : String(error ?? 'An unexpected routing error occurred.');

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-canvas)]">
      <div className="max-w-md w-full p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] space-y-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Application Error</h2>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{errorMessage}</p>
        <div className="flex gap-2">
          {reset && (
            <button
              type="button"
              onClick={() => reset()}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            Reload Console
          </button>
        </div>
      </div>
    </div>
  );
}
