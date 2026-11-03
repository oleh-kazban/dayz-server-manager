import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@dsm/api-contracts': path.resolve(workspaceRoot, 'libs/api-contracts/src/index.ts'),
      '@dsm/api-client': path.resolve(__dirname, 'src/index.ts'),
    },
  },
  test: {
    pool: 'threads',
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: path.resolve(workspaceRoot, 'coverage/libs/api-client'),
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts', 'src/**/*.{test,spec}.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
