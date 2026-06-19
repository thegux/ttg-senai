import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev:  Vite on :5173 proxies /api/* to wrangler pages dev on :8788.
// Prod: Cloudflare Pages serves dist/ and routes /api/* to functions/.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
