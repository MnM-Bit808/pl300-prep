/**
 * End-to-end tests against the production build (`npm run build` first), served by
 * `vite preview` with the same security headers as Cloudflare Pages.
 *
 * To test a deployed site instead, set PW_BASE_URL (e.g. https://test.pl300-prep.pages.dev): no
 * local server is started.
 *
 * Browsers: CI installs Playwright's Chromium. Locally, `npx playwright install chromium` once, or
 * point at an installed browser with PW_CHANNEL=msedge (or chrome).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4174; // not 4173, so a preview you already have open isn't reused by mistake
const channel = process.env.PW_CHANNEL;
const external = process.env.PW_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // Most tests want the network as it is; the offline spec turns the service worker on.
    serviceWorkers: 'block',
    ...(channel ? { channel } : {}),
  },
  projects: [
    {
      // The brief's floor: a 375px phone, touch, mobile user agent.
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 375, height: 812 },
        ...(channel ? { channel } : {}),
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        ...(channel ? { channel } : {}),
      },
    },
  ],
  webServer: external
    ? undefined
    : {
        command: `npx vite preview --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
