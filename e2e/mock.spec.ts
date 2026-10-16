/**
 * Acceptance: a full mock exam runs, locks the case section's predecessor, scores per domain, and
 * submits itself when time runs out (with the browser clock fast-forwarded, not waited out).
 */
import { choose, expect, openPage, test } from './fixtures';

test('a mock exam runs, locks section 1 behind you, and scores by domain', async ({ page }) => {
  await openPage(page, '/mock');
  await page.getByRole('button', { name: 'Start a mock exam' }).click();
  await expect(page).toHaveURL(/\/mock\/exam$/);
  await expect(page.getByText(/^Section 1 of 2/)).toBeVisible();
  // The exam is the serious part: no Googly, no reactions.
  await expect(page.locator('[data-mood]')).toHaveCount(0);
  await expect(page.getByRole('timer')).toHaveAccessibleName(/^Time left 1:(40:00|39:5\d)$/);

  // Answer the first question (if it's a choice: the order is shuffled), mark it, move on.
  if (await page.getByRole('radio').count()) await choose(page, 'radio');
  await page.getByRole('button', { name: 'Mark for review' }).click();
  await page.getByRole('button', { name: /^Next/ }).click();
  await expect(page.getByText(/^Question 2 of/)).toBeVisible();

  // Finish section 1 from the question map, unanswered questions and all.
  await page.getByRole('button', { name: /Questions/ }).click();
  await page.getByRole('button', { name: /Review section/ }).click();
  await page.getByRole('button', { name: 'Finish section 1' }).click();
  const confirm = page.getByRole('dialog', { name: 'Finish section 1?' });
  await expect(confirm).toContainText('can’t come back to this section');
  await confirm.getByRole('button', { name: 'Finish section' }).click();

  // Section 2 is the case study; section 1 is locked.
  await expect(page.getByText(/^Section 2 of 2: /)).toBeVisible();
  await page.getByRole('button', { name: /Questions/ }).click();
  await expect(page.getByText('Section 1 is finished and locked.')).toBeVisible();
  await page.getByRole('button', { name: 'Close question map' }).click();

  await page.getByRole('button', { name: /End exam/ }).click();
  await page.getByRole('button', { name: 'End and score' }).click();
  await expect(page).toHaveURL(/\/mock\/results\/mock-/);
  await expect(page.getByText('out of 1,000')).toBeVisible();
  const domains = page.getByRole('region', { name: 'By exam domain' });
  for (const d of [/Prepare/, /Model/, /Visuali[sz]e/, /Manage/])
    await expect(domains).toContainText(d);
});

test('the exam submits itself when the time runs out', async ({ page }) => {
  await page.clock.install();
  await openPage(page, '/mock');
  await page.getByRole('button', { name: 'Start a mock exam' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  if (await page.getByRole('radio').count()) await choose(page, 'radio');

  await page.clock.fastForward('01:40:05');
  await expect(page.getByText('Time’s up: the exam was submitted automatically.')).toBeVisible();
  await expect(page).toHaveURL(/\/mock\/results\/mock-/);
  await expect(page.getByText('out of 1,000')).toBeVisible();
});
