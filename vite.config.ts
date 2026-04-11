import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages with custom domain serves from root.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
