import { defineConfig } from '@playwright/test'

// Runs against the static export (npm run build first). Gemini is always mocked in the tests.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium' },
  projects: [
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: { command: 'node scripts/serve-out.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
})
