/**
 * Acceptance: lessons cheer you on. A right answer pops its XP, three in a row is a combo (and
 * is announced), a miss resets it, and a finished lesson gets Googly's confetti. With Reduce
 * motion there's no confetti at all.
 */
import { bank, choose, expect, openPage, test, type Page } from './fixtures';

const LESSON = '/learn/prepare-1';
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Answers the question on screen, right or wrong, by finding it in the bank by its stem. */
async function answer(page: Page, right: boolean) {
  const card = page.locator('article').first();
  const stemId = await card.getAttribute('aria-labelledby');
  const stem = norm(await page.locator(`[id="${stemId}"]`).innerText()).slice(0, 40);
  const q = bank.questions.find((x) => norm(x.stem).startsWith(stem));
  if (!q) throw new Error(`no question starts "${stem}"`);
  if (q.type === 'single') {
    const pick = q.options!.find((o) => (o.id === q.answer) === right)!;
    await choose(card, 'radio', pick.text);
  } else if (q.type === 'yesno') {
    const groups = card.getByRole('radiogroup');
    for (const [i, yes] of (q.answer as boolean[]).entries()) {
      const say = i === 0 && !right ? !yes : yes;
      await choose(groups.nth(i), 'radio', say ? 'Yes' : 'No');
    }
  } else throw new Error(`${q.id}: the storage-modes lesson has only single and yes/no questions`);
  await page.getByRole('button', { name: 'Check' }).click();
}

/** Continues until the lesson ends, answering everything right. */
async function finish(page: Page) {
  while (await page.getByRole('button', { name: 'Continue' }).count()) {
    await page.getByRole('button', { name: 'Continue' }).click();
    if (!(await page.locator('article').count())) break;
    await answer(page, true);
  }
  await expect(
    page.getByRole('heading', { name: /^(Lesson complete|Perfect lesson)$/ }),
  ).toBeVisible();
}

const combo = (page: Page) => page.getByRole('status').filter({ hasText: /in a row/ });

test('right answers pop XP and build a combo; a finished lesson gets confetti', async ({
  page,
}) => {
  await openPage(page, LESSON);
  await answer(page, true);
  await expect(page.getByText('+10 XP')).toBeAttached();
  await expect(page.locator('[data-phase="revealed"] [data-mood="happy"]')).toBeVisible();

  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Continue' }).click();
    await answer(page, true);
  }
  await expect(combo(page)).toHaveText('3 in a row');

  await page.getByRole('button', { name: 'Continue' }).click();
  await answer(page, false);
  await expect(page.locator('[data-phase="revealed"] [data-mood="oops"]')).toBeVisible();
  await expect(combo(page)).toHaveCount(0);
  await expect(page.getByText('4 hearts left')).toBeAttached();

  await finish(page);
  const confetti = page.locator('[data-shape]');
  expect(await confetti.count()).toBeGreaterThan(20);
  // Decoration only, and it clears itself away.
  await expect(confetti.first().locator('..')).toHaveAttribute('aria-hidden', 'true');
  await expect(confetti).toHaveCount(0, { timeout: 5000 });
});

test('with Reduce motion, a finished lesson has no confetti', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPage(page, LESSON);
  await answer(page, true);
  await finish(page);
  await expect(page.locator('[data-shape]')).toHaveCount(0);
});
