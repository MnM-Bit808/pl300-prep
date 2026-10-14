/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { bankAssets } from './vite/bank-assets.ts';

const bankDir = fileURLToPath(new URL('./pl300-bank', import.meta.url));

export default defineConfig({
  plugins: [react(), bankAssets(bankDir)],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
