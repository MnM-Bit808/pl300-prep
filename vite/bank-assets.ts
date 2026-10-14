/**
 * Serves pl300-bank/images at /bank/images/* in dev and copies them into the build, so the bank
 * folder stays the single source of truth (nothing is duplicated into public/).
 */
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, normalize, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

const URL_PREFIX = '/bank/images/';

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

export function bankAssets(bankDir: string): Plugin {
  const imagesDir = join(bankDir, 'images');

  return {
    name: 'pl300-bank-assets',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (!url?.startsWith(URL_PREFIX)) return next();

        const file = normalize(join(imagesDir, decodeURIComponent(url.slice(URL_PREFIX.length))));
        // Refuse anything that escapes the images folder (e.g. ../).
        if (!file.startsWith(imagesDir + sep) || !file.endsWith('.svg') || !existsSync(file)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(file).pipe(res);
      });
    },

    generateBundle() {
      for (const file of walk(imagesDir)) {
        if (!file.endsWith('.svg')) continue;
        this.emitFile({
          type: 'asset',
          fileName: `bank/images/${relative(imagesDir, file).split(sep).join('/')}`,
          source: readFileSync(file),
        });
      }
    },
  };
}
