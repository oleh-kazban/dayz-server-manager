import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(workspaceRoot, 'dist/apps/web'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@dsm/ui': path.resolve(workspaceRoot, 'libs/ui/src'),
      '@dsm': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 4200,
    host: 'localhost',
  },
});
