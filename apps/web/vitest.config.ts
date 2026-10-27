import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@dsm/ui': path.resolve(workspaceRoot, 'libs/ui/src'),
      '@dsm': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    pool: 'threads',
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'test-setup.ts')],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: path.resolve(workspaceRoot, 'coverage/apps/web'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/index.ts',
        'src/**/*.types.ts',
        'src/**/*.schema.ts',
        'src/main.tsx',
        'src/router.tsx',
        'src/styles/**',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
