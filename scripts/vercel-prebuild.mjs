// Spouští se při buildu na Vercelu (npm run vercel-build) před `next build`:
// 1) migrace databáze – přes přímé (nepoolované) spojení, pokud ho poskytovatel nabízí (Neon),
// 2) při SEED_DEMO=1 nahraje ukázková data (idempotentně – opakovaný build nic nezdvojí).
import { execSync } from "node:child_process";

// názvy, které používá ruční nastavení i integrace Neon/Postgres na Vercelu
const direct =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!direct) {
  const seen = Object.keys(process.env).filter((k) => /DATABASE|POSTGRES|NEON|^PG/i.test(k));
  console.error("Chybí adresa databáze (DATABASE_URL).");
  console.error(seen.length ? `Build vidí jen tyto databázové proměnné: ${seen.join(", ")}` : "Build nevidí žádnou databázovou proměnnou.");
  console.error(
    "Na Vercelu: Settings → Environment Variables → přidejte DATABASE_URL (zaškrtnuté prostředí Production) a pak Deployments → … → Redeploy.",
  );
  process.exit(1);
}
const env = { ...process.env, DATABASE_URL: direct };

execSync("npx prisma migrate deploy", { stdio: "inherit", env });
if (process.env.SEED_DEMO === "1") {
  console.log("SEED_DEMO=1 → nahrávám ukázková data");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
}
