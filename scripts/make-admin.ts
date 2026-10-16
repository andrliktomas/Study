// Použití: npm run make-admin -- email@domena.cz
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const email = process.argv[2]?.toLowerCase().trim();

(async () => {
  if (!email) throw new Error("Zadejte e-mail: npm run make-admin -- email@domena.cz");
  const user = await db.user.update({ where: { email }, data: { role: "ADMIN" } });
  console.log(`${user.email} je nyní administrátor.`);
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
