import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { intlayer } from 'vite-intlayer';
import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteReact(), tailwindcss(), intlayer()],
  test: {
    globals: true,
    environment: 'jsdom',
    reporters: process.env.GITHUB_ACTIONS ? ['dot', 'github-actions'] : ['dot'],
  },
  base: process.env.BASE_URL || '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
