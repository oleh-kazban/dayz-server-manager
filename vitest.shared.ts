import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

/** Absolute path of the workspace root (this file's directory). */
export const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path of `src/index.ts` of a library under `libs/`, for test aliases. */
export function libEntry(name: string): string {
  return path.join(workspaceRoot, 'libs', name, 'src', 'index.ts');
}

/** Coverage output folder of a project, e.g. `coverage/libs/rcon` or `coverage/apps/web`. */
export function coverageDirectory(projectDir: string): string {
  return path.join(workspaceRoot, 'coverage', path.relative(workspaceRoot, projectDir));
}

/**
 * Base Vitest config shared by every project. Each project's `vitest.config.ts` extends it with
 * `mergeConfig(sharedVitestConfig, defineConfig({ ... }))` and declares only what is specific to it:
 * `root`, aliases, `coverage.reportsDirectory`, and anything that differs (environment, setup
 * files, plugins, extra patterns).
 *
 * Note: `mergeConfig` concatenates arrays, so a project's `include` / `exclude` entries are added
 * to the ones below instead of replacing them.
 */
export const sharedVitestConfig = defineConfig({
  test: {
    pool: 'threads',
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.{test,spec}.ts', 'src/**/__fixtures__/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
