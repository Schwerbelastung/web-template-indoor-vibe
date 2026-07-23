const { expect } = require('@playwright/test');

// Log in through the UI. Staging pages are server-side rendered: values typed
// before React hydration get wiped when the app takes over the page, so the
// email fill is retried until it sticks.
const login = async (page, email, password) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const emailField = page.getByLabel(/email/i);
  await expect(async () => {
    await emailField.fill(email);
    await expect(emailField).toHaveValue(email, { timeout: 500 });
  }).toPass({ timeout: 30 * 1000 });

  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
  // Login redirects away from /login when it succeeds.
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30 * 1000 });
};

module.exports = { login };
