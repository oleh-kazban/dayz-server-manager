import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, mergeConfig } from 'vitest/config';

import { coverageDirectory, sharedVitestConfig, workspaceRoot } from '../../vitest.shared';

const projectDir = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  sharedVitestConfig,
  defineConfig({
    root: projectDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@aegis/api-contracts': path.join(workspaceRoot, 'libs/api-contracts/src'),
        '@aegis/api-client': path.join(workspaceRoot, 'libs/api-client/src'),
        '@aegis/dayz-config': path.join(workspaceRoot, 'libs/dayz-config/src'),
        '@aegis/ui': path.join(workspaceRoot, 'libs/ui/src'),
        '@aegis/web': path.join(projectDir, 'src'),
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
          'src/**/*.types.ts',
          'src/**/*.schema.ts',
          'src/main.tsx',
          'src/router.tsx',
          'src/styles/**',
          'src/**/*.{test,spec}.tsx',
          'src/**/*.d.ts',
        ],
      },
    },
  }),
);
