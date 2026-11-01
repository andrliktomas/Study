// Připraví čistou E2E databázi: migrace + ukázková data. Spouští se před `playwright test`.
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { E2E_DATABASE_URL, MAIL_OUTBOX_DIR } from "../../playwright.config";

const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
execSync("npx prisma migrate reset --force --skip-generate --skip-seed", { stdio: "inherit", env });
execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
rmSync(MAIL_OUTBOX_DIR, { recursive: true, force: true });
