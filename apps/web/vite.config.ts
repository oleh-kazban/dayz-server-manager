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
      '@aegis/api-contracts': path.resolve(workspaceRoot, 'libs/api-contracts/src'),
      '@aegis/api-client': path.resolve(workspaceRoot, 'libs/api-client/src'),
      '@aegis/ui': path.resolve(workspaceRoot, 'libs/ui/src'),
      '@aegis/web': path.resolve(__dirname, 'src'),
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
