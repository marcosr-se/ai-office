import { defineConfig } from 'vite';

// base './' para que la build funcione en cualquier subcarpeta (p. ej. GitHub Pages).
export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2000 },
});
