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
      '@aegis/dayz-config': path.resolve(workspaceRoot, 'libs/dayz-config/src'),
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
        // When the API goes away mid-response (e.g. it restarts on a code change), end the
        // browser's side too. Otherwise a proxied SSE stream stays open and silent, and live
        // updates never reconnect until the page is reloaded.
        configure: proxy => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            proxyRes.on('close', () => {
              if (!res.writableEnded) {
                res.destroy();
              }
            });
          });
        },
      },
    },
  },
});
