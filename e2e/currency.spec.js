const { test, expect } = require('@playwright/test');

// The dual-price format is e.g. "49,00 € (≈ $56.03 USD)" — these tests only require
// that a "$… USD" estimate in parentheses follows a price, whatever the locale.
// They skip when the marketplace has no listings yet. The estimate needs the dev
// server to reach the Frankfurter API once (the server caches the rate for 12 hours).
const USD_ESTIMATE_PATTERN = /\(≈\s?\$[^)]*USD\)/;

// When the FX service is unreachable, prices intentionally fall back to plain
// EUR — skip these tests instead of failing (the fallback is by design).
let rateAvailable = false;
test.beforeAll(async ({ request }) => {
  const apiBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3500';
  try {
    const res = await request.get(`${apiBase}/api/exchange-rate`);
    const data = await res.json();
    rateAvailable = typeof data.rate === 'number';
  } catch (e) {
    rateAvailable = false;
  }
});

test('a search-page listing card shows EUR with a USD estimate', async ({ page }) => {
  test.skip(!rateAvailable, 'FX rate unavailable (Frankfurter unreachable) — EUR-only fallback is by design.');
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
  test.skip(!rateAvailable, 'FX rate unavailable (Frankfurter unreachable) — EUR-only fallback is by design.');
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
