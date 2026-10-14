/** Acceptance: all 440 questions load, and every exhibit is served and decodes as an image. */
import { allImages, bank, expect, openPage, test } from './fixtures';

test('the bank check page reports every question and no problems', async ({ page }) => {
  await openPage(page, '/dev/bank');
  await expect(
    page.getByText(`${bank.questions.length} questions`, { exact: false }),
  ).toBeVisible();
  await expect(page.getByText('Validation: no issues')).toBeVisible();
  await expect(page.getByText('Images: 94 of 94 loaded')).toBeVisible();
});

test('every exhibit loads and decodes', async ({ page }) => {
  const images = allImages();
  expect(images).toHaveLength(94);
  await openPage(page, '/');
  const failed = await page.evaluate(async (srcs) => {
    const bad: string[] = [];
    await Promise.all(
      srcs.map(async (src) => {
        const img = new Image();
        img.src = `/bank/${src}`;
        try {
          await img.decode();
          if (!img.naturalWidth) bad.push(`${src}: zero width`);
        } catch {
          bad.push(`${src}: did not decode`);
        }
      }),
    );
    return bad;
  }, images);
  expect(failed).toEqual([]);
});
