import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests', // Look for tests in the "e2e-tests" directory

  fullyParallel: true, // Run tests in files in the order of their definition
  forbidOnly: !!process.env.CI, // Fail the build on CI if test.only is left in
  retries: process.env.CI ? 2 : 0, // Retry on CI only
  workers: process.env.CI ? 1 : undefined, // Opt out of parallel tests on CI
  reporter: 'list', // Use the "list" reporter for non-interactive output

  // Global test timeout
  timeout: 30000,

  // Timeout for expect() assertions
  expect: {
    timeout: 30000,
  },

  use: {
    // Optional defaults for actions and navigations
    actionTimeout: 30000,
    navigationTimeout: 15000,

    // Base URL for page.goto('/')
    baseURL: 'http://localhost:4000',

    // Collect traces upon failing the first time
    trace: 'on',

    // Capture screenshots only on failure
    screenshot: 'only-on-failure',

    // Browser launch options
    launchOptions: {
      args: ['--disable-web-security'], // Needed for scenarios like file uploads outside the domain
    },
  },

  // Configure projects for major browsers
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