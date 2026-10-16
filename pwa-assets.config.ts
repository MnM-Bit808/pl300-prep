/**
 * App icons, generated at build time from public/icon.svg by @vite-pwa/assets-generator:
 * favicon.ico, PWA icons, a maskable icon and the Apple touch icon. The maskable and Apple icons
 * sit on the tile's own yellow, so its rounded corners blend into the square the OS masks.
 */
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const tile = '#e6f36b';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // No extra padding: the face is drawn inside the maskable safe zone already.
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: tile } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: tile } },
  },
  images: ['public/icon.svg'],
});
