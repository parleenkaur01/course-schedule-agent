import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: new URL('./sidepanel.html', import.meta.url).pathname } },
});
