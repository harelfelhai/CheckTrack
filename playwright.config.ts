import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the UI-probe regression suite.
 *
 * Prerequisites:
 *   1. npm i -D @playwright/test
 *   2. A running dev server: `npm run dev` (http://localhost:3000)
 * Then: `npx playwright test`
 *
 * Uses the system Chrome (channel: "chrome") so no Chromium download is needed.
 */
export default defineConfig({
  testDir: "./tests/ui-probe",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
