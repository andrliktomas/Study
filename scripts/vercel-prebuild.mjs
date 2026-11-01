// Spouští se při buildu na Vercelu (npm run vercel-build) před `next build`:
// 1) migrace databáze – přes přímé (nepoolované) spojení, pokud ho poskytovatel nabízí (Neon),
// 2) při SEED_DEMO=1 nahraje ukázková data (idempotentně – opakovaný build nic nezdvojí).
import { execSync } from "node:child_process";

const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!direct) {
  console.error("Chybí DATABASE_URL – připojte databázi (např. Neon) v nastavení projektu na Vercelu.");
  process.exit(1);
}
const env = { ...process.env, DATABASE_URL: direct };

execSync("npx prisma migrate deploy", { stdio: "inherit", env });
if (process.env.SEED_DEMO === "1") {
  console.log("SEED_DEMO=1 → nahrávám ukázková data");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
}
