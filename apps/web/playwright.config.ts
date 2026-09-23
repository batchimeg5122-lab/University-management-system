import { defineConfig, devices } from '@playwright/test';

/**
 * E2E тест: npx playwright install chromium (нэг удаа) → npm run test:e2e
 * Туршилтын (mock) горимоор ажиллуулна — backend, Supabase хэрэггүй.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },
  webServer: {
    command: 'npx vite build --mode e2e && npx vite preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
    env: { VITE_DATA_SOURCE: 'mock' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
