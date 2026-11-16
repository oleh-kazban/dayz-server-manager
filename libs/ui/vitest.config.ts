import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, mergeConfig } from 'vitest/config';

import { coverageDirectory, sharedVitestConfig } from '../../vitest.shared';

const projectDir = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  sharedVitestConfig,
  defineConfig({
    root: projectDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@aegis/ui': path.join(projectDir, 'src'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: [path.join(projectDir, 'test-setup.ts')],
      include: ['src/**/*.{test,spec}.tsx'],
      coverage: {
        reportsDirectory: coverageDirectory(projectDir),
        include: ['src/**/*.tsx'],
        exclude: [
          'src/**/*.stories.{ts,tsx}',
          'src/**/*.types.ts',
          'src/styles/**',
          'src/**/*.{test,spec}.tsx',
          'src/**/*.d.ts',
        ],
      },
    },
  }),
);
