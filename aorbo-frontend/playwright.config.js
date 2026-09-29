import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  reporter: 'html',

  // Starts the Vite dev server automatically (the Django API must already
  // be running on :8000 for these end-to-end tests).
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },

  use: {
    baseURL: 'http://localhost:5173/',
    headless: false,
    viewport: {
      width: 1280,
      height: 720,
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
});