/**
 * Every test fails on a console error, an uncaught exception, a failed or 4xx/5xx request, or a
 * Content-Security-Policy violation: the brief's "no console errors", checked on every page we
 * visit rather than on a list of pages.
 */
import { readFileSync } from 'node:fs';
import { expect, test as base, type Locator, type Page } from '@playwright/test';

export { expect };
export type { Page } from '@playwright/test';

interface Fixtures {
  /** Problems seen so far. Push to `allowed` patterns a test expects (an offline request). */
  problems: { seen: string[]; allow: (pattern: RegExp) => void };
}

export const test = base.extend<Fixtures>({
  problems: [
    async ({ page }, use) => {
      const seen: string[] = [];
      const allowed: RegExp[] = [];
      const note = (text: string) => {
        if (!allowed.some((a) => a.test(text))) seen.push(text);
      };
      page.on('console', (m) => {
        if (m.type() === 'error') note(`console: ${m.text()}`);
      });
      page.on('pageerror', (e) => note(`uncaught: ${e.message}`));
      page.on('requestfailed', (r) => {
        const why = r.failure()?.errorText ?? '';
        // Aborted by the page itself (navigating away, a cancelled download): not a failure.
        if (!why.includes('ERR_ABORTED')) note(`request failed: ${r.url()} ${why}`);
      });
      page.on('response', (r) => {
        if (r.status() >= 400) note(`HTTP ${r.status()}: ${r.url()}`);
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) =>
          console.error(`CSP blocked ${e.effectiveDirective}: ${e.blockedURI || 'inline'}`),
        );
      });
      await use({ seen, allow: (pattern) => allowed.push(pattern) });
      expect(seen, 'console errors, failed requests or CSP violations').toEqual([]);
    },
    { auto: true },
  ],
});

// ---------- The bank, read from disk so tests know the answers ----------

interface RawQuestion {
  id: string;
  type: 'single' | 'multi' | 'yesno' | 'order' | 'dropdown';
  caseId?: string;
  image?: { src: string; alt: string } | null;
  options?: { id: string; text: string }[];
  items?: { id: string; text: string }[];
  answer: unknown;
}
interface RawCase {
  id: string;
  title: string;
  tabs: { title: string; image?: { src: string } | null }[];
}

export const bank = JSON.parse(
  readFileSync(new URL('../pl300-bank/questions/all_questions.json', import.meta.url), 'utf8'),
) as { questions: RawQuestion[]; cases: RawCase[] };

export const question = (id: string) => {
  const q = bank.questions.find((x) => x.id === id);
  if (!q) throw new Error(`no question ${id}`);
  return q;
};

/** Every exhibit the bank refers to, from questions and case tabs. */
export const allImages = () => {
  const srcs = new Set<string>();
  for (const q of bank.questions) if (q.image?.src) srcs.add(q.image.src);
  for (const c of bank.cases) for (const t of c.tabs) if (t.image?.src) srcs.add(t.image.src);
  return [...srcs];
};

// ---------- Page helpers ----------

/** Waits for a page's main heading, which appears once its questions have loaded. */
export async function openPage(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('h1').first()).toBeVisible();
}

/**
 * Picks an answer the way a learner does: by its label. The inputs themselves are invisible and
 * ignore the pointer (the whole tile is the target), so Playwright's `check()` would refuse.
 */
export async function choose(
  scope: Page | Locator,
  role: 'radio' | 'checkbox',
  name?: string | RegExp,
) {
  const input = name ? scope.getByRole(role, { name, exact: true }) : scope.getByRole(role).first();
  await input.locator('xpath=ancestor::label[1]').click();
  await expect(input).toBeChecked();
}

/** Width the page scrolls to beyond the viewport (0 means it fits). */
export const overflowX = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
