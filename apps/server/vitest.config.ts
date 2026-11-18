import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, mergeConfig } from 'vitest/config';

import { coverageDirectory, libEntry, sharedVitestConfig } from '../../vitest.shared.ts';

const projectDir = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  sharedVitestConfig,
  defineConfig({
    root: projectDir,
    resolve: {
      alias: {
        '@aegis/api-contracts': libEntry('api-contracts'),
        '@aegis/database': libEntry('database'),
        '@aegis/dayz-config': libEntry('dayz-config'),
        '@aegis/platform': libEntry('platform'),
        '@aegis/rcon': libEntry('rcon'),
        '@aegis/server': path.join(projectDir, 'src'),
      },
    },
    test: {
      coverage: {
        reportsDirectory: coverageDirectory(projectDir),
        exclude: ['src/main.ts', 'src/types/**'],
      },
    },
  }),
);
