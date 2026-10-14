/**
 * App icons, generated at build time from public/icon.svg by @vite-pwa/assets-generator:
 * favicon.ico, PWA icons, a maskable icon and the Apple touch icon. The maskable and Apple icons
 * sit on the brand indigo, so the mark's rounded corners blend into the square the OS masks.
 */
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const indigo = '#3a3fb0';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // No extra padding: the mark is drawn inside the maskable safe zone already.
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: indigo } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: indigo } },
  },
  images: ['public/icon.svg'],
});
