const { test, expect } = require('@playwright/test');

// Activates when E2E_BADGE_USER_ID is set to the UUID of a user whose profile metadata
// contains indoorExperienceYears ("1" | "2" | "3") — see docs/BADGES.md for how to set it.
const badgeUserId = process.env.E2E_BADGE_USER_ID;

test('profile page of a badge-holder shows the experience badge', async ({ page }) => {
  test.skip(!badgeUserId, 'E2E_BADGE_USER_ID not set — see docs/BADGES.md');
  await page.goto(`/u/${badgeUserId}`);
  await expect(page.getByTestId('experience-badge')).toBeVisible();
  await expect(page.getByTestId('experience-badge')).toContainText(/Indoor rider · \d\+ years/);
});
