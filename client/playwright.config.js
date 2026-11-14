import { defineConfig, devices } from '@playwright/test'

const localURL = 'http://127.0.0.1:5173'
const baseURL = process.env.E2E_BASE_URL || localURL

const startLocalServer = baseURL === localURL

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',

  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  ...(startLocalServer
    ? {
        webServer: {
          command:
            'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
          url: localURL,
          timeout: 60_000,
          reuseExistingServer: !process.env.CI,
          stdout: 'ignore',
          stderr: 'pipe',
        },
      }
    : {}),
})
