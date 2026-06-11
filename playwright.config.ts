import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  // In CI, also emit machine-readable results for the reports dashboard.
  reporter: process.env.CI
    ? [['github'], ['json', { outputFile: 'reports/playwright.json' }]]
    : 'list',
  use: {
    baseURL: 'http://localhost:4173/tuples/',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Run against the production build — what actually ships to Pages.
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/tuples/',
    reuseExistingServer: !process.env.CI,
  },
});
