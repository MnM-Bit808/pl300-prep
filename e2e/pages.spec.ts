/**
 * Every page loads cleanly (the fixture fails on any console error, bad request or CSP
 * violation), names itself in the title, has a heading, and fits the screen without sideways
 * scrolling: the brief's "usable on a 375-pixel-wide phone screen", on every page.
 */
import { expect, openPage, overflowX, test } from './fixtures';

const PAGES: [path: string, title: RegExp, heading: RegExp][] = [
  ['/', /^Learn · PL-300 Prep$/, /^Learn$/],
  ['/concepts', /^Concept simulators/, /^Concept simulators$/],
  ['/concepts/join-kinds', /^Join kinds simulator/, /^Join kinds$/],
  ['/concepts/append-vs-merge', /^Append vs Merge simulator/, /^Append vs Merge$/],
  ['/concepts/filter-context', /^Filter context simulator/, /^Filter context$/],
  ['/concepts/star-vs-snowflake', /^Star vs snowflake simulator/, /^Star vs snowflake$/],
  ['/practice', /^Practice ·/, /^Practice$/],
  ['/practice/run?mode=custom&n=5', /^Practice ·/, /.+/],
  ['/practice/cards', /^Flashcards ·/, /^Flashcards$/],
  ['/mock', /^Mock exam ·/, /^Mock exam$/],
  ['/mock/exam', /^Mock exam ·/, /^No mock exam in progress$/],
  ['/progress', /^Progress ·/, /^Progress$/],
  ['/workings', /^My workings ·/, /^My workings$/],
  ['/settings', /^Settings ·/, /^Settings$/],
  ['/lab', /^Question lab ·/, /^Question lab$/],
  ['/lab?id=CASE-001', /^Question lab ·/, /^Question lab$/],
  ['/dev/bank', /^Bank check ·/, /^Question bank$/],
  ['/no/such/page', /^Page not found ·/, /^Page not found$/],
];

for (const [path, title, heading] of PAGES) {
  test(`${path} loads, is named, and fits`, async ({ page }) => {
    await openPage(page, path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('h1').first()).toHaveText(heading);
    expect(await overflowX(page)).toBe(0);
  });
}

test('the first lesson opens in focus mode, named after the lesson', async ({ page }) => {
  await openPage(page, '/');
  await page
    .getByRole('link', { name: /^(Start|Continue|Start lesson)/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/learn\//);
  await expect(page).toHaveTitle(/ · PL-300 Prep$/);
  await expect(page.getByRole('button', { name: 'Check' })).toBeVisible();
  expect(await overflowX(page)).toBe(0);
});
