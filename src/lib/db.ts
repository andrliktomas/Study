import { PrismaClient } from "@prisma/client";

/**
 * Adresa databáze. Kromě DATABASE_URL bereme i názvy, které vytváří integrace Neon/Postgres na Vercelu
 * (POSTGRES_PRISMA_URL je poolovaná adresa připravená pro Prismu).
 */
export function databaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = databaseUrl();
export const db = globalForPrisma.prisma ?? new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
