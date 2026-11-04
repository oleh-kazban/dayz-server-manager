import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '../..');
const pkg = JSON.parse(fs.readFileSync(path.resolve(workspaceRoot, 'package.json'), 'utf-8'));

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(`v${pkg.version}`),
  },
  build: {
    outDir: path.resolve(workspaceRoot, 'dist/apps/web'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@dsm/api-contracts': path.resolve(workspaceRoot, 'libs/api-contracts/src'),
      '@dsm/api-client': path.resolve(workspaceRoot, 'libs/api-client/src'),
      '@dsm/ui': path.resolve(workspaceRoot, 'libs/ui/src'),
      '@dsm/web': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 4200,
    host: 'localhost',
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
