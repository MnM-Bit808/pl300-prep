/**
 * Automated accessibility checks (axe-core, WCAG 2.2 A and AA) on every page in light and dark,
 * and on the states where problems hide: answered questions, open dialogs, the case panel and
 * the exam. Automated checks catch roughly a third of real issues; keyboard.spec.ts covers more.
 */
import AxeBuilder from '@axe-core/playwright';
import { choose, expect, openPage, test, type Page } from './fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'];

async function audit(page: Page, label: string) {
  // Judge the settled screen: finish short transitions (a result fading in) so axe doesn't
  // measure half-transparent text. Endless ones, like the schema's flow dash, are left running.
  await page.evaluate(() => {
    for (const a of document.getAnimations())
      if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  });
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const readable = violations.map(
    (v) =>
      `${label}: [${v.impact}] ${v.id}: ${v.help}\n` +
      v.nodes
        .slice(0, 4)
        .map((n) => `    ${n.target.join(' ')}: ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`)
        .join('\n'),
  );
  expect(readable, `axe violations on ${label}`).toEqual([]);
}

const PAGES = [
  '/',
  '/concepts',
  '/concepts/join-kinds',
  '/concepts/append-vs-merge',
  '/concepts/filter-context',
  '/concepts/star-vs-snowflake',
  '/practice',
  '/practice/cards',
  '/mock',
  '/progress',
  '/workings',
  '/settings',
  '/lab',
  '/dev/bank',
  '/no/such/page',
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.beforeEach(async ({ page }) => page.emulateMedia({ colorScheme: scheme }));

    for (const path of PAGES) {
      test(`${path}`, async ({ page }) => {
        await openPage(page, path);
        await audit(page, `${path} (${scheme})`);
      });
    }

    test('answered question with feedback, notes and tools', async ({ page }) => {
      await openPage(page, '/lab?id=PRE-001');
      await choose(page, 'radio');
      await page.getByRole('button', { name: 'Check' }).click();
      await page.getByRole('button', { name: 'Add a note' }).click();
      await audit(page, `answered question (${scheme})`);
    });

    // Every answer format, chosen on purpose: the exam's first question is random, so it can't be
    // relied on to cover them (an ordering question's headings once slipped through that way).
    for (const [format, id] of [
      ['multiple answers', 'PRE-016'],
      ['yes/no', 'PRE-007'],
      ['drop-downs', 'PRE-014'],
      ['ordering', 'PRE-012'],
    ] as const) {
      test(`${format} question`, async ({ page }) => {
        await openPage(page, `/lab?id=${id}`);
        await audit(page, `${format} question (${scheme})`);
      });
    }

    test('exhibit viewer', async ({ page }) => {
      await openPage(page, '/lab?id=PRE-006');
      await page.getByRole('button', { name: /Enlarge/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await audit(page, `exhibit viewer (${scheme})`);
    });

    test('case study question', async ({ page }) => {
      await openPage(page, '/lab?id=CASE-001');
      const open = page.getByRole('button', { name: 'Read case' });
      if (await open.isVisible()) await open.click();
      await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
      await audit(page, `case study (${scheme})`);
    });

    test('mock exam question and question map', async ({ page }) => {
      await openPage(page, '/mock');
      await page.getByRole('button', { name: 'Start a mock exam' }).click();
      await expect(page.getByRole('timer')).toBeVisible();
      await audit(page, `exam question (${scheme})`);
      await page.getByRole('button', { name: /Questions/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await audit(page, `exam question map (${scheme})`);
    });

    test('lesson in progress and a flipped flashcard', async ({ page }) => {
      await openPage(page, '/');
      await page
        .getByRole('link', { name: /^(Start|Continue|Start lesson)/ })
        .first()
        .click();
      await expect(page.getByRole('button', { name: 'Check' })).toBeVisible();
      await audit(page, `lesson (${scheme})`);
      await openPage(page, '/practice/cards');
      await page.getByRole('button', { name: 'Show answer' }).click();
      await audit(page, `flashcard answer (${scheme})`);
    });

    test('simulators after interaction', async ({ page }) => {
      await openPage(page, '/concepts/filter-context');
      await page.getByRole('radio', { name: 'Red sales (KEEPFILTERS)' }).check();
      await page.getByRole('button', { name: /^Blue, Total/ }).click();
      await audit(page, `filter context, KEEPFILTERS (${scheme})`);
      await openPage(page, '/concepts/star-vs-snowflake');
      await page.getByRole('button', { name: 'Flatten into a star' }).click();
      await audit(page, `star schema, flattened (${scheme})`);
    });
  });
}

test('in Windows High Contrast, what you chose still looks chosen', async ({ page }) => {
  // Forced colours drop the backgrounds this app uses for selection; global.css redraws them.
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const background = (label: ReturnType<Page['locator']>) =>
    label.evaluate((el) => getComputedStyle(el).backgroundColor);

  await openPage(page, '/lab?id=PRE-007');
  const statement = page.getByRole('radiogroup').first();
  await choose(statement, 'radio', 'Yes');
  const yes = statement.getByRole('radio', { name: 'Yes' }).locator('xpath=ancestor::label[1]');
  const no = statement.getByRole('radio', { name: 'No' }).locator('xpath=ancestor::label[1]');
  expect(await background(yes)).not.toBe(await background(no));

  await openPage(page, '/concepts/join-kinds');
  const chip = (name: RegExp) =>
    page.getByRole('radio', { name }).locator('xpath=ancestor::label[1]');
  expect(await background(chip(/Left outer/))).not.toBe(await background(chip(/Inner/)));
});
