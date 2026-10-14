/**
 * Acceptance: each question type renders and scores correctly, driven as a learner would, with
 * the right answers read from the bank. Case questions show their tabs and exhibit.
 */
import { choose, expect, openPage, question, test } from './fixtures';

const optionText = (id: string, optionId: string) =>
  question(id).options!.find((o) => o.id === optionId)!.text;

test('single choice: right answer scores Correct; a wrong one shows the answer', async ({
  page,
}) => {
  await openPage(page, '/lab?id=PRE-001');
  await choose(page, 'radio', optionText('PRE-001', 'B'));
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('heading', { name: 'Not quite' })).toBeVisible();
  await expect(page.getByText('Correct answer')).toBeVisible();

  await page.getByRole('button', { name: 'Try again' }).click();
  await choose(page, 'radio', optionText('PRE-001', 'A'));
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('heading', { name: 'Correct', exact: true })).toBeVisible();
});

test('multiple choice: both right picks score Correct', async ({ page }) => {
  await openPage(page, '/lab?id=PRE-016');
  for (const id of question('PRE-016').answer as string[])
    await choose(page, 'checkbox', optionText('PRE-016', id));
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('heading', { name: 'Correct', exact: true })).toBeVisible();
});

test('yes/no: one answer per statement, scored part by part', async ({ page }) => {
  await openPage(page, '/lab?id=PRE-007');
  const answers = question('PRE-007').answer as boolean[];
  const groups = page.getByRole('radiogroup');
  await expect(groups).toHaveCount(answers.length);
  for (const [i, yes] of answers.entries())
    await choose(groups.nth(i), 'radio', yes ? 'Yes' : 'No');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('heading', { name: 'Correct', exact: true })).toBeVisible();
});

test('dropdowns: each part chosen from its list', async ({ page }) => {
  await openPage(page, '/lab?id=PRE-014');
  const [connector, auth] = (question('PRE-014').answer as { parts: number[] }).parts;
  await page.getByRole('combobox', { name: 'Connector' }).selectOption(String(connector));
  await page.getByRole('combobox', { name: 'Authentication' }).selectOption(String(auth));
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('heading', { name: 'Correct', exact: true })).toBeVisible();
});

test('ordering: steps added in sequence, distractors left out', async ({ page }) => {
  await openPage(page, '/lab?id=PRE-012');
  const pool = page.getByRole('region', { name: 'Actions' });
  for (const id of question('PRE-012').answer as string[]) {
    const text = question('PRE-012').items!.find((i) => i.id === id)!.text;
    await pool.getByRole('button', { name: new RegExp(`^${escape(text.slice(0, 30))}`) }).click();
  }
  await expect(page.getByRole('region', { name: 'Answer area' }).getByRole('listitem')).toHaveCount(
    4,
  );
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('heading', { name: 'Correct', exact: true })).toBeVisible();
});

test('a case question shows its case tabs and the exhibit', async ({ page }) => {
  await openPage(page, '/lab?id=CASE-001');
  // On a phone the case opens as a sheet; on a wide screen it sits beside the question.
  const open = page.getByRole('button', { name: 'Read case' });
  if (await open.isVisible()) await open.click();
  await expect(page.getByRole('tab')).toHaveText([
    'Overview',
    'Data sources',
    'Requirements',
    'Exhibit',
  ]);
  await page.getByRole('tab', { name: 'Exhibit' }).click();
  const exhibit = page.getByRole('tabpanel').getByRole('img').first();
  await expect(exhibit).toBeVisible();
  // Exhibits load lazily: give it a moment to arrive and decode.
  await expect
    .poll(() => exhibit.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);
});

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
