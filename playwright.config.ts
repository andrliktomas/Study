import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/lektorium_e2e";
export const MAIL_OUTBOX_DIR = process.env.MAIL_OUTBOX_DIR ?? "test-results/outbox";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "cs-CZ",
    timezoneId: "Europe/Prague",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // volitelně vlastní Chromium (např. předinstalovaný v kontejneru); jinak ten z `npx playwright install`
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
      },
    },
  ],
  webServer: {
    // aplikaci je potřeba předem sestavit (npm run build)
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      NEXTAUTH_URL: `http://localhost:${PORT}`,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-secret",
      ALLOW_FAKE_PAYMENTS: "1",
      MAIL_OUTBOX_DIR,
      CRON_SECRET: "e2e-cron",
      STRIPE_SECRET_KEY: "",
      SMTP_HOST: "",
      GOOGLE_CLIENT_ID: "",
    },
  },
});
