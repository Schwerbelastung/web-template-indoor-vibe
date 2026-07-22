const { test, expect } = require('@playwright/test');

// Phase 1 smoke tests: prove the app boots, talks to the Sharetribe APIs, and renders
// the three core surfaces. They are written to pass on a marketplace with no listings yet:
// the listing-page test skips itself (with a note) until at least one listing exists.

test('landing page loads and shows the hero section', async ({ page }) => {
  await page.goto('/');
  // The topbar signup link renders only after the app has loaded its hosted configuration.
  // Match by href, not by text, so the test is independent of the UI language.
  await expect(page.locator('a[href="/signup"]').first()).toBeVisible();
  const hero = page.locator('h1').first();
  await expect(hero).toBeVisible();
  await expect(hero).not.toBeEmpty();
});

test('the Sora brand font is applied and actually loaded', async ({ page }) => {
  await page.goto('/');
  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(fontFamily).toContain('Sora');
  const soraLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px Sora') && document.fonts.check('800 16px Sora');
  });
  expect(soraLoaded).toBe(true);
});

test('search page renders results or an empty-state message', async ({ page }) => {
  await page.goto('/s');
  const listingCard = page.locator('a[href*="/l/"]:not([href="/l/new"])').first();
  // The app renders separate mobile and desktop empty-state messages; only one is visible.
  const noResults = page
    .getByText(/couldn't find any listings|no results/i)
    .filter({ visible: true })
    .first();
  // Either outcome proves the search request to the Marketplace API completed.
  await expect(listingCard.or(noResults).first()).toBeVisible();
});

test('a listing page shows a price', async ({ page }) => {
  await page.goto('/s');
  const listingCard = page.locator('a[href*="/l/"]:not([href="/l/new"])').first();
  const hasListings = await listingCard
    .waitFor({ state: 'visible', timeout: 20 * 1000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!hasListings, 'No listings on the marketplace yet — rerun after creating one.');

  await listingCard.click();
  await expect(page).toHaveURL(/\/l\//);
  // Marketplace currency is EUR, so the listing page should show a euro price.
  // Accept the € on either side of the number so the test is locale-agnostic.
  await expect(page.getByText(/(€\s?\d)|(\d\s?€)/).first()).toBeVisible();
});
