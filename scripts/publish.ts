/**
 * Publishes PL-300 Prep to Cloudflare Pages, the same way Paath is published (wrangler, a
 * production branch and a `test` preview branch).
 *
 *   npm run deploy:check     build and check dist/, upload nothing
 *   npm run deploy:preview   ... then upload to the `test` preview branch
 *   npm run deploy           ... then upload to production
 *
 * Before anything is uploaded it checks that dist/ holds exactly what the app needs: the shell,
 * the service worker and manifest, the headers file, every exhibit, and no source maps, Markdown
 * or raw bank files. The bank's questions ship inside a hashed JS chunk, which the app loads.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PROJECT = 'pl300-prep';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const branch = args.has('--preview') ? 'test' : 'main';

const run = (cmd: string) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [relative(DIST, path).replace(/\\/g, '/')];
  });
}

const fail = (message: string): never => {
  console.error(`\n✗ ${message}`);
  process.exit(1);
};

if (!args.has('--skip-build')) run('npm run build');
if (!existsSync(DIST)) fail('dist/ is missing: the build did not run.');

const files = walk(DIST);
const has = (path: string) => files.includes(path);

for (const required of [
  'index.html',
  'sw.js',
  'manifest.webmanifest',
  '_headers',
  'favicon.ico',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'maskable-icon-512x512.png',
  'apple-touch-icon-180x180.png',
]) {
  if (!has(required)) fail(`dist/${required} is missing.`);
}

const bank = JSON.parse(
  readFileSync(join(ROOT, 'pl300-bank', 'questions', 'all_questions.json'), 'utf8'),
) as {
  questions: { image?: { src: string } | null }[];
  cases: { tabs: { image?: { src: string } | null }[] }[];
};
const images = new Set<string>();
for (const q of bank.questions) if (q.image?.src) images.add(q.image.src);
for (const c of bank.cases) for (const t of c.tabs) if (t.image?.src) images.add(t.image.src);
const missing = [...images].filter((src) => !has(`bank/${src}`));
if (missing.length) fail(`exhibits missing from dist/bank: ${missing.join(', ')}`);

const stray = files.filter(
  (f) => /\.(map|md|zip|ts|tsx)$/.test(f) || /(^|\/)all_questions\.json$/.test(f),
);
if (stray.length) fail(`files that shouldn't ship: ${stray.join(', ')}`);

const csp = readFileSync(join(DIST, '_headers'), 'utf8');
if (!csp.includes('Content-Security-Policy:')) fail('_headers has no Content-Security-Policy.');

const bytes = files.reduce((sum, f) => sum + statSync(join(DIST, f)).size, 0);
console.log(
  `\n✓ dist/ checked: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(2)} MB, ` +
    `${images.size} exhibits, headers and service worker present.`,
);

if (dryRun) {
  console.log('Dry run: nothing uploaded.');
  process.exit(0);
}

// The address is <project>.pages.dev unless that name was taken (then Cloudflare adds a suffix,
// as with paath-3gf): wrangler prints the real one when the upload finishes.
console.log(`Uploading to Cloudflare Pages: project ${PROJECT}, branch ${branch}.\n`);
run(`wrangler pages deploy dist --project-name ${PROJECT} --branch ${branch} --commit-dirty=true`);
