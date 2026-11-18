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
        '@aegis/api-client': libEntry('api-client'),
      },
    },
    test: {
      coverage: { reportsDirectory: coverageDirectory(projectDir) },
    },
  }),
);
