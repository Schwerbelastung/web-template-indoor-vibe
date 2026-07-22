const { test, expect } = require('@playwright/test');

// Cart flow tests. They need a logged-in user, so they run only when
// E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD are set (e.g. in .env, which
// playwright.config.js loads). They also need at least two purchase listings
// from the same seller with stock; otherwise the multi-item parts are skipped.
const email = process.env.E2E_TEST_USER_EMAIL;
const password = process.env.E2E_TEST_USER_PASSWORD;

const login = async page => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
  // Login redirects away from /login when it succeeds.
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20 * 1000 });
};

const cartCountBadge = page => page.locator('#cart-link [class*="cartCount"]');

const addCurrentListingToCart = async page => {
  // Wait for the order form to be rendered before probing for the quantity
  // select (locator.count() doesn't wait by itself).
  const addToCartButton = page.getByRole('button', { name: /add to cart/i });
  await addToCartButton.waitFor({ state: 'visible', timeout: 15 * 1000 });

  // Quantity select is present only when the listing has more than one item in
  // stock and multiple-item orders are allowed; pick 1 when it exists.
  const quantitySelect = page.locator('select[id$="quantity"]');
  if (await quantitySelect.count()) {
    await quantitySelect.selectOption('1');
  }
  await addToCartButton.click();
};

test.describe('shopping cart', () => {
  test.skip(!email || !password, 'E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD not set in .env');

  test('add items, edit quantity, and remove on the cart page', async ({ page }) => {
    test.setTimeout(120 * 1000);
    await login(page);

    // Collect purchase listings from search: open each result and check
    // whether it has an Add to cart button (only purchase listings do).
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
      const addToCart = page.getByRole('button', { name: /add to cart/i });
      const hasButton = await addToCart
        .waitFor({ state: 'visible', timeout: 10 * 1000 })
        .then(() => true)
        .catch(() => false);
      if (hasButton) {
        purchaseListingUrls.push(href);
      }
    }
    test.skip(purchaseListingUrls.length === 0, 'No purchase listings with stock found.');

    // Start from a clean cart: remove any leftovers from earlier runs.
    await page.goto('/cart');
    const removeButtons = page.getByRole('button', { name: /^remove$/i });
    while (await removeButtons.count()) {
      const before = await removeButtons.count();
      await removeButtons.first().click();
      await expect(removeButtons).toHaveCount(before - 1, { timeout: 15 * 1000 });
    }

    // Add the first listing; the topbar badge should show 1.
    await page.goto(purchaseListingUrls[0]);
    await addCurrentListingToCart(page);
    await expect(cartCountBadge(page)).toHaveText('1', { timeout: 15 * 1000 });

    // Add the second listing from the same seller when available.
    const expectTwoItems = purchaseListingUrls.length > 1;
    if (expectTwoItems) {
      await page.goto(purchaseListingUrls[1]);
      await addCurrentListingToCart(page);
      await expect(cartCountBadge(page)).toHaveText('2', { timeout: 15 * 1000 });
    }

    // The cart page lists the added items.
    await page.goto('/cart');
    const rows = page.getByTestId('cart-item-row');
    await expect(rows).toHaveCount(expectTwoItems ? 2 : 1, { timeout: 20 * 1000 });

    // Increase the first item's quantity if its stock allows (+ is enabled).
    const firstRowPlus = rows
      .first()
      .getByRole('button', { name: /increase quantity/i });
    if (await firstRowPlus.isEnabled()) {
      await firstRowPlus.click();
      await expect(rows.first().getByTestId('cart-item-quantity')).toHaveText('2', {
        timeout: 15 * 1000,
      });
    }

    // Remove everything again to leave a clean cart behind.
    while (await removeButtons.count()) {
      const before = await removeButtons.count();
      await removeButtons.first().click();
      await expect(removeButtons).toHaveCount(before - 1, { timeout: 15 * 1000 });
    }
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 15 * 1000 });
  });
});
