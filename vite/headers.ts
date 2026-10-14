/**
 * HTTP headers, defined once. The build writes them to dist/_headers for Cloudflare Pages, and
 * `vite preview` sends the same set, so the end-to-end tests run under the production policy.
 *
 * The CSP allows only this origin: no inline scripts, no eval (Zod runs jitless), no inline
 * <style>. React sets style props through the CSSOM, which CSP doesn't restrict. Exhibits are
 * <img> SVGs, so their own markup never runs in the page.
 */
import type { Plugin } from 'vite';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** Only on the real host: HSTS over plain-http localhost is meaningless. */
const HOSTED_ONLY: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000',
};

const block = (path: string, headers: Record<string, string>) =>
  [path, ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`)].join('\n');

/** Emits dist/_headers in Cloudflare Pages format. */
export function cloudflareHeaders(): Plugin {
  return {
    name: 'pl300:cloudflare-headers',
    apply: 'build',
    generateBundle() {
      const file = [
        block('/*', { ...SECURITY_HEADERS, ...HOSTED_ONLY }),
        // Hashed file names never change content: cache for a year.
        block('/assets/*', { 'Cache-Control': 'public, max-age=31536000, immutable' }),
        // The service worker and its manifest must be revalidated, or updates stall.
        block('/sw.js', { 'Cache-Control': 'no-cache' }),
        block('/manifest.webmanifest', { 'Cache-Control': 'no-cache' }),
      ].join('\n\n');
      this.emitFile({ type: 'asset', fileName: '_headers', source: `${file}\n` });
    },
  };
}
