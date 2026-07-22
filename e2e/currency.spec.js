const { test, expect } = require('@playwright/test');

// The dual-price format is e.g. "49,00 € (≈ $56.03 USD)" — these tests only require
// that a "$… USD" estimate in parentheses follows a price, whatever the locale.
// They skip when the marketplace has no listings yet. The estimate needs the dev
// server to reach the Frankfurter API once (the server caches the rate for 12 hours).
const USD_ESTIMATE_PATTERN = /\(≈\s?\$[^)]*USD\)/;

test('a search-page listing card shows EUR with a USD estimate', async ({ page }) => {
  await page.goto('/s');
  const listingCard = page.locator('a[href*="/l/"]:not([href="/l/new"])').first();
  const hasListings = await listingCard
    .waitFor({ state: 'visible', timeout: 20 * 1000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!hasListings, 'No listings on the marketplace yet — rerun after creating one.');

  await expect(listingCard.getByText(USD_ESTIMATE_PATTERN).first()).toBeVisible();
});

test('a listing page shows the headline price with a USD estimate', async ({ page }) => {
  await page.goto('/s');
  const listingCard = page.locator('a[href*="/l/"]:not([href="/l/new"])').first();
  const hasListings = await listingCard
    .waitFor({ state: 'visible', timeout: 20 * 1000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!hasListings, 'No listings on the marketplace yet — rerun after creating one.');

  await listingCard.click();
  await expect(page).toHaveURL(/\/l\//);
  await expect(page.getByText(USD_ESTIMATE_PATTERN).first()).toBeVisible();
});
