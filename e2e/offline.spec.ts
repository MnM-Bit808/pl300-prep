/**
 * Installable and offline: the manifest is valid, the service worker takes control, and with the
 * network cut the app still opens, loads questions and shows exhibits.
 */
import { expect, openPage, test } from './fixtures';

test.use({ serviceWorkers: 'allow' });

test('the web app manifest describes an installable app', async ({ page, request }) => {
  await openPage(page, '/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    name: 'PL-300 Prep',
    short_name: 'PL-300 Prep',
    start_url: '/',
    display: 'standalone',
  });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).ok()).toBe(true);
});

test('with the network off, lessons, questions and exhibits still work', async ({
  page,
  context,
}) => {
  await openPage(page, '/');
  // Wait for the service worker to finish precaching and take control of the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r));
  });
  await expect(page.getByRole('status').getByText(/Ready to work offline/)).toBeVisible();

  // The precache really holds the app shell and every exhibit. (A duplicate entry once made
  // Workbox reject the whole list: the worker installed, and cached nothing.)
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys())
      for (const req of await (await caches.open(key)).keys()) urls.push(new URL(req.url).pathname);
    return urls;
  });
  expect(cached).toContain('/index.html');
  expect(cached.filter((u) => u.startsWith('/bank/images/'))).toHaveLength(94);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Learn', level: 1 })).toBeVisible();

  // A deep link that was never visited online, with an exhibit.
  await page.goto('/lab?id=PRE-006');
  const exhibit = page.locator('figure img').first();
  await expect(exhibit).toBeVisible();
  await expect
    .poll(() => exhibit.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);

  // And a page whose code is a separate chunk.
  await page.goto('/concepts/filter-context');
  await expect(page.getByRole('heading', { name: 'Filter context', level: 1 })).toBeVisible();
  await context.setOffline(false);
});
