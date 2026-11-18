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
        '@aegis/database': libEntry('database'),
        '@aegis/api-contracts': libEntry('api-contracts'),
      },
    },
    test: {
      coverage: { reportsDirectory: coverageDirectory(projectDir) },
    },
  }),
);
