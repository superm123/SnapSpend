import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests', // Look for tests in the "e2e-tests" directory
  /* Run tests in files in the order of their definition */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'list', // Use the "list" reporter for non-interactive output
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    timeout: 15000, // Increase default timeout for actions and expectations
    expect: {
      timeout: 15000, // Increase expect timeout for assertions
    },
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect traces upon failing the first time. See https://playwright.dev/docs/trace-viewer */
    trace: 'on',
    screenshot: 'only-on-failure',
    /* Do not open HTML report. This ensures zero human interaction. */
    launchOptions: {
      args: ['--disable-web-security'], // Needed for some scenarios like file uploads from outside the domain
    },
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

});
