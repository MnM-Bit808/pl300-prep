/**
 * Acceptance: progress, notes and reports survive a reload, and round-trip through a backup
 * file: back up, wipe everything, restore, and it's all back.
 */
import { choose, expect, openPage, test, type Page } from './fixtures';

const NOTE = 'Remember: dual mode caches dimensions';

async function answeredCount(page: Page) {
  await openPage(page, '/progress');
  const tile = page.getByText('questions answered at least once').locator('..');
  const intro = page.getByRole('heading', { name: 'Your progress builds up here' });
  // Nothing answered yet: the page explains itself instead of showing a 0.
  await expect(tile.or(intro)).toBeVisible();
  if (await intro.isVisible()) return 0;
  return Number((await tile.textContent())?.match(/\d+/)?.[0] ?? 0);
}

test('answers, notes, flags and reports survive a reload and a backup round trip', async ({
  page,
}) => {
  // Answer one practice question, then flag it, note it and report it.
  // A subtopic whose questions are all single choice, so the first radio is an answer.
  await openPage(page, '/practice/run?mode=custom&n=1&subtopic=Query%20folding');
  await choose(page, 'radio');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: 'Flag' }).click();
  await page.getByRole('button', { name: 'Add a note' }).click();
  const noteBox = page.getByRole('textbox', { name: /^Note on [A-Z]+-\d+$/ });
  const label = await noteBox.evaluate((el: HTMLTextAreaElement) => el.labels?.[0]?.textContent);
  const id = label!.replace('Note on ', '').trim();
  await noteBox.fill(NOTE);
  await expect(page.getByText('Saved')).toBeVisible();
  await page.getByRole('button', { name: 'Report a problem' }).click();
  const report = page.getByRole('dialog', { name: `Report a problem with ${id}` });
  await report.getByLabel('The wording is unclear').check();
  await report.getByRole('button', { name: 'Save report' }).click();
  await expect(report).toBeHidden();
  // Shown on screen and announced in a live region: either means it's written.
  await expect(page.getByText(/^Report saved/).first()).toBeVisible();

  // A reload keeps all of it.
  await page.reload();
  expect(await answeredCount(page)).toBe(1);
  await openPage(page, '/workings');
  await expect(page.getByText(NOTE)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flagged 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reports 1' })).toBeVisible();

  // Back up to a file.
  await openPage(page, '/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Back up everything' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^pl300-prep-backup-.*\.json$/);
  const file = await download.path();

  // Wipe everything, notes included.
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await page.getByLabel('Also delete my notes, flags and reports').check();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByText('Progress, notes, flags and reports deleted.')).toBeVisible();
  expect(await answeredCount(page)).toBe(0);
  await openPage(page, '/workings');
  await expect(page.getByText(NOTE)).toHaveCount(0);

  // Restore from the file: everything is back.
  await openPage(page, '/settings');
  await page.locator('input[type="file"]').setInputFiles(file);
  const confirm = page.getByRole('dialog', { name: 'Replace everything with this backup?' });
  await expect(confirm).toContainText(/1 (question|answer)/);
  await Promise.all([
    page.waitForEvent('load'),
    confirm.getByRole('button', { name: 'Replace and reload' }).click(),
  ]);
  expect(await answeredCount(page)).toBe(1);
  await openPage(page, '/workings');
  await expect(page.getByText(NOTE)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flagged 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reports 1' })).toBeVisible();
});
