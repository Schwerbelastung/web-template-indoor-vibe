const { defineConfig, devices } = require('@playwright/test');

// Load .env so tests can read optional settings like E2E_TEST_USER_EMAIL /
// E2E_TEST_USER_PASSWORD (the file is gitignored; tests skip if these are unset).
require('dotenv').config();

// PLAYWRIGHT_BASE_URL lets the same tests run against a deployed site (staging in Phase 7).
// When it is set, Playwright does not start a local dev server.
const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

module.exports = defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  timeout: 90 * 1000,
  expect: { timeout: 20 * 1000 },
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: remoteBaseUrl || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: remoteBaseUrl
    ? undefined
    : {
        command: 'yarn run dev',
        port: 3000,
        reuseExistingServer: true,
        timeout: 180 * 1000,
      },
});
