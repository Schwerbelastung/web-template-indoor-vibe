const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

// Verifies that a seller does NOT get an "Add to cart" button on their own
// listing (self-purchases are also rejected by the Marketplace API, but the
// button shouldn't be there in the first place). Runs only when seller
// credentials are provided: E2E_SELLER_EMAIL / E2E_SELLER_PASSWORD.
const email = process.env.E2E_SELLER_EMAIL;
const password = process.env.E2E_SELLER_PASSWORD;

test('own listings do not offer an Add to cart button', async ({ page }) => {
  test.skip(!email || !password, 'E2E_SELLER_EMAIL / E2E_SELLER_PASSWORD not set');

  await login(page, email, password);

  // Open the first listing from search — in the test marketplace the seller owns them.
  await page.goto('/s');
  const listingCard = page.locator('a[href*="/l/"]:not([href="/l/new"])').first();
  await listingCard.waitFor({ state: 'visible', timeout: 20 * 1000 });
  await listingCard.click();
  await expect(page).toHaveURL(/\/l\//);

  // The ownership banner proves we're looking at an own listing…
  await expect(page.getByText(/this is your own listing/i).first()).toBeVisible({
    timeout: 20 * 1000,
  });
  // …and the order form has rendered (Buy now exists, though inert for owners).
  await expect(page.getByRole('button', { name: /buy now/i }).first()).toBeVisible();

  // The cart button must not exist for the owner.
  await expect(page.getByRole('button', { name: /add to cart/i })).toHaveCount(0);
});
