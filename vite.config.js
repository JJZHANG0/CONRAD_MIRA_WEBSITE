import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const pages = ['index', 'product', 'technology', 'applications', 'impact', 'team', 'explore', 'contact'];
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: { input: Object.fromEntries(pages.map(page => [page, resolve(import.meta.dirname, `${page}.html`)])) },
  },
});
