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
      MAIL_OUTBOX_DIR,
      CRON_SECRET: "e2e-cron",
      SMTP_HOST: "",
      OPERATOR_NAME: "Lektorium s.r.o.",
      OPERATOR_ID: "12345678",
      OPERATOR_ADDRESS: "Testovací 1, 110 00 Praha",
      OPERATOR_EMAIL: "fakturace@example.com",
      OPERATOR_ACCOUNT_HOLDER: "Lektorium s.r.o.",
      OPERATOR_IBAN_CZK: "CZ6508000000192000145399",
      OPERATOR_BIC_CZK: "GIBACZPX",
      OPERATOR_IBAN_EUR: "DE89370400440532013000",
      OPERATOR_BIC_EUR: "COBADEFFXXX",
      GOOGLE_CLIENT_ID: "",
    },
  },
});
