/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { bankAssets } from './vite/bank-assets.ts';
import { cloudflareHeaders, SECURITY_HEADERS } from './vite/headers.ts';

const bankDir = fileURLToPath(new URL('./pl300-bank', import.meta.url));

const DESCRIPTION =
  'Lessons, practice, mock exams and concept simulators for the PL-300 Power BI Data Analyst exam.';

export default defineConfig({
  plugins: [
    react(),
    bankAssets(bankDir),
    cloudflareHeaders(),
    VitePWA({
      // Updates wait for the learner: a prompt offers to reload, never mid-exam (see UpdatePrompt).
      registerType: 'prompt',
      injectRegister: false,
      // Light and dark theme-color metas live in index.html; prefs.ts follows the in-app theme.
      pwaAssets: { config: true, overrideManifestIcons: true, injectThemeColor: false },
      manifest: {
        id: '/',
        name: 'PL-300 Prep',
        short_name: 'PL-300 Prep',
        description: DESCRIPTION,
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f2f3f7',
        theme_color: '#ffffff',
        categories: ['education'],
        shortcuts: [
          { name: 'Practice', url: '/practice' },
          { name: 'Mock exam', url: '/mock' },
          { name: 'Progress', url: '/progress' },
        ],
      },
      workbox: {
        // Everything, exhibits included, so lessons and mocks work with no connection. Not
        // *.webmanifest: the plugin adds the manifest itself, and a second entry with another
        // revision makes Workbox reject the whole list (the worker then installs caching nothing).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/bank\//, /^\/assets\//],
        cleanupOutdatedCaches: true,
        // The first install takes over the open tab, so it's offline-ready without a reload.
        // Later versions still wait for the learner's Reload (no skipWaiting).
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rolldownOptions: {
      output: {
        // React and the router change far less often than the app: their own chunk means an
        // update downloads only the app's code.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
  preview: { headers: SECURITY_HEADERS },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
