import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client bez nativního query enginu: dotazy jdou přes ovladač `pg` (engineType = "client").
 * Díky tomu běží všude, kde běží Node – i na Windows ARM64, pro který Prisma engine nevydává.
 */
export function createPrismaClient(connectionString: string | undefined) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
