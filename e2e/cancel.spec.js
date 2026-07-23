const { test, expect } = require('@playwright/test');

// Live test of the 2-hour cancellation window (Phase 6): buys a listing with a
// test-mode Stripe payment, verifies the cancel button + countdown, cancels,
// and checks the order ends up canceled (full refund is triggered by the
// transaction process itself). Tagged @payment — runs only on demand:
//   $env:E2E_INCLUDE_PAYMENT="true"; yarn run test:e2e cancel
const email = process.env.E2E_TEST_USER_EMAIL;
const password = process.env.E2E_TEST_USER_PASSWORD;

const { login } = require('./helpers');

test('a purchase can be cancelled within the 2-hour window @payment', async ({ page }) => {
  test.skip(!email || !password, 'E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD not set in .env');
  test.setTimeout(180 * 1000);

  await login(page, email, password);

  // Find a purchase listing with stock (it has an Add to cart button).
  await page.goto('/s');
  const cardLinks = page.locator('a[href*="/l/"]:not([href="/l/new"])');
  await cardLinks.first().waitFor({ state: 'visible', timeout: 20 * 1000 });
  const hrefs = await cardLinks.evaluateAll(links => [
    ...new Set(links.map(l => l.getAttribute('href'))),
  ]);

  let purchaseListingUrl = null;
  for (const href of hrefs) {
    await page.goto(href);
    const hasButton = await page
      .getByRole('button', { name: /add to cart/i })
      .waitFor({ state: 'visible', timeout: 10 * 1000 })
      .then(() => true)
      .catch(() => false);
    if (hasButton) {
      purchaseListingUrl = href;
      break;
    }
  }
  test.skip(!purchaseListingUrl, 'No purchase listing with stock found.');

  // Buy now (quantity 1) → checkout.
  await page.goto(purchaseListingUrl);
  const quantitySelect = page.locator('select[id$="quantity"]');
  await quantitySelect.first().waitFor({ state: 'visible', timeout: 15 * 1000 });
  await quantitySelect.selectOption('1');
  const deliverySelect = page.locator('select[id$="deliveryMethod"]');
  if (await deliverySelect.count()) {
    await deliverySelect.selectOption('pickup');
  }
  await page.getByRole('button', { name: /buy now/i }).click();
  await expect(page).toHaveURL(/\/checkout/, { timeout: 20 * 1000 });

  // Pay with the Stripe test card.
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
  await stripeFrame.locator('[name="cardnumber"]').fill('4242 4242 4242 4242');
  await stripeFrame.locator('[name="exp-date"]').fill('12 / 30');
  await stripeFrame.locator('[name="cvc"]').fill('123');
  const postalField = stripeFrame.locator('[name="postal"]');
  if (await postalField.count()) {
    await postalField.fill('00100');
  }
  await page.getByLabel(/card holder/i).fill('E2E Cancel Tester');
  await page.getByLabel(/street address/i).fill('Testikatu 1');
  await page.getByLabel(/postal code/i).fill('00100');
  await page.getByLabel(/^city/i).fill('Helsinki');
  await page.getByLabel(/country/i).selectOption('FI');

  await page.getByRole('button', { name: /confirm|pay/i }).click();
  await page.waitForURL(/\/order\//, { timeout: 90 * 1000 });

  // The new cancellation window: cancel button + live countdown are visible.
  const cancelButton = page
    .getByRole('button', { name: /cancel order/i })
    .filter({ visible: true })
    .first();
  await expect(cancelButton).toBeVisible({ timeout: 30 * 1000 });
  await expect(
    page
      .getByText(/you can still cancel free of charge/i)
      .filter({ visible: true })
      .first()
  ).toBeVisible();

  // Cancel and verify the order ends up canceled (process refunds automatically).
  await cancelButton.click();
  await expect(
    page
      .getByText(/the order was canceled/i)
      .filter({ visible: true })
      .first()
  ).toBeVisible({ timeout: 30 * 1000 });
});
