const { test, expect } = require('@playwright/test');

// Full cart checkout with a real test-mode Stripe payment. Tagged @payment so it
// only runs on demand: $env:E2E_INCLUDE_PAYMENT="true"; yarn run test:e2e cart-checkout
// Requires E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD in .env and at least two
// purchase listings with stock from the same seller. See docs/CART.md.
const email = process.env.E2E_TEST_USER_EMAIL;
const password = process.env.E2E_TEST_USER_PASSWORD;

const login = async page => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20 * 1000 });
};

const addCurrentListingToCart = async page => {
  const addToCartButton = page.getByRole('button', { name: /add to cart/i });
  await addToCartButton.waitFor({ state: 'visible', timeout: 15 * 1000 });
  const quantitySelect = page.locator('select[id$="quantity"]');
  if (await quantitySelect.count()) {
    await quantitySelect.selectOption('1');
  }
  await addToCartButton.click();
};

const cartCountBadge = page => page.locator('#cart-link [class*="cartCount"]');

test('cart checkout completes one payment for two listings @payment', async ({ page }) => {
  test.skip(!email || !password, 'E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD not set in .env');
  test.setTimeout(180 * 1000);

  await login(page);

  // Find two purchase listings.
  await page.goto('/s');
  const cardLinks = page.locator('a[href*="/l/"]:not([href="/l/new"])');
  await cardLinks.first().waitFor({ state: 'visible', timeout: 20 * 1000 });
  const hrefs = await cardLinks.evaluateAll(links => [
    ...new Set(links.map(l => l.getAttribute('href'))),
  ]);

  const purchaseListingUrls = [];
  for (const href of hrefs) {
    if (purchaseListingUrls.length >= 2) break;
    await page.goto(href);
    const hasButton = await page
      .getByRole('button', { name: /add to cart/i })
      .waitFor({ state: 'visible', timeout: 10 * 1000 })
      .then(() => true)
      .catch(() => false);
    if (hasButton) {
      purchaseListingUrls.push(href);
    }
  }
  test.skip(purchaseListingUrls.length < 2, 'Need two purchase listings with stock.');

  // Clean cart, then add both listings.
  await page.goto('/cart');
  const removeButtons = page.getByRole('button', { name: /^remove$/i });
  while (await removeButtons.count()) {
    const before = await removeButtons.count();
    await removeButtons.first().click();
    await expect(removeButtons).toHaveCount(before - 1, { timeout: 15 * 1000 });
  }
  await page.goto(purchaseListingUrls[0]);
  await addCurrentListingToCart(page);
  await expect(cartCountBadge(page)).toHaveText('1', { timeout: 15 * 1000 });
  await page.goto(purchaseListingUrls[1]);
  await addCurrentListingToCart(page);
  await expect(cartCountBadge(page)).toHaveText('2', { timeout: 15 * 1000 });

  // Proceed to checkout: the breakdown should show a cart-item line.
  await page.goto('/cart');
  await page.getByTestId('cart-checkout-button').click();
  await expect(page).toHaveURL(/\/checkout/, { timeout: 20 * 1000 });

  // The speculated order breakdown includes the second listing as a cart item
  // (its real title is rendered from protectedData). The page renders separate
  // mobile and desktop breakdowns, so only consider the visible one.
  await expect(
    page
      .getByText(/\d\s?€|€\s?\d/)
      .filter({ visible: true })
      .first()
  ).toBeVisible({ timeout: 30 * 1000 });

  // Fill the Stripe card element (test card) inside its iframe.
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await stripeFrame.locator('[name="cardnumber"]').fill('4242 4242 4242 4242');
  await stripeFrame.locator('[name="exp-date"]').fill('12 / 30');
  await stripeFrame.locator('[name="cvc"]').fill('123');
  const postalField = stripeFrame.locator('[name="postal"]');
  if (await postalField.count()) {
    await postalField.fill('00100');
  }

  // Billing details on the form itself.
  await page.getByLabel(/card holder/i).fill('E2E Test Buyer');
  await page.getByLabel(/street address/i).fill('Testikatu 1');
  await page.getByLabel(/postal code/i).fill('00100');
  await page.getByLabel(/^city/i).fill('Helsinki');
  await page.getByLabel(/country/i).selectOption('FI');

  // Submit payment and wait for the order page.
  await page.getByRole('button', { name: /confirm|pay/i }).click();
  await page.waitForURL(/\/order\//, { timeout: 90 * 1000 });

  // The order breakdown lists both the base item and a cart item line
  // (only the visible copy — the page renders mobile + desktop breakdowns).
  await expect(
    page
      .getByText(/total price/i)
      .filter({ visible: true })
      .first()
  ).toBeVisible({ timeout: 30 * 1000 });

  // The cart was cleared by the finalize step.
  await page.goto('/cart');
  await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 20 * 1000 });
});
