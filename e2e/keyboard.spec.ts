/**
 * Keyboard use, which automated audits can't judge: the skip link, focus landing on each new
 * page's heading, a visible focus ring on every tab stop, answering without a mouse, and dialogs
 * that close on Escape and give focus back.
 */
import { expect, openPage, test, type Page } from './fixtures';

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? { tag: el.tagName, text: el.textContent?.trim().slice(0, 60) ?? '' } : null;
  });

/** True if the focused element, or the control it sits in, draws a focus indicator. */
const hasFocusRing = (page: Page) =>
  page.evaluate(() => {
    let el = document.activeElement as HTMLElement | null;
    for (let i = 0; el && i < 3; i++, el = el.parentElement) {
      const s = getComputedStyle(el);
      if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) return true;
      if (s.boxShadow !== 'none') return true;
    }
    return false;
  });

async function tabTo(page: Page, name: RegExp, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const f = await focused(page);
    if (f && name.test(f.text)) return;
  }
  throw new Error(`never reached ${name} by Tab`);
}

test('the skip link is the first tab stop and jumps to the content', async ({ page }) => {
  await openPage(page, '/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('moving to another page puts focus on its heading and resets the scroll', async ({ page }) => {
  await openPage(page, '/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await tabTo(page, /^Practice$/);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole('heading', { name: 'Practice', level: 1 })).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page).toHaveTitle(/^Practice · PL-300 Prep$/);
});

test('every tab stop on the home page shows a focus ring', async ({ page }) => {
  await openPage(page, '/');
  const missing: string[] = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const f = await focused(page);
    if (!f || f.tag === 'BODY') break;
    if (!(await hasFocusRing(page))) missing.push(`${f.tag} "${f.text}"`);
  }
  expect(missing).toEqual([]);
});

test('a question can be answered with the keyboard alone', async ({ page }) => {
  await openPage(page, '/lab?id=PRE-001');
  await page.locator('body').press('a'); // letter shortcuts pick by screen position
  await expect(page.getByRole('radio').first()).toBeChecked();
  await tabTo(page, /^Check$/);
  expect(await hasFocusRing(page)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: /Correct|Not quite/ })).toBeVisible();
});

test('the exhibit viewer closes on Escape and returns focus', async ({ page }) => {
  await openPage(page, '/lab?id=PRE-006');
  const enlarge = page.getByRole('button', { name: /Enlarge/ });
  await enlarge.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(enlarge).toBeFocused();
});
