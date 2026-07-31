import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset paths relative so the build works on GitHub Pages
// (any repo name) and when opened directly from the filesystem.
export default defineConfig({
  plugins: [react()],
  base: './',
});
