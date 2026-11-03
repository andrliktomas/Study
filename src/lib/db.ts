import type { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "./prisma-client";

/**
 * Adresa databáze. Kromě DATABASE_URL bereme i názvy, které vytváří integrace Neon/Postgres na Vercelu.
 * POSTGRES_PRISMA_URL má přednost: je to poolovaná adresa s parametry pro Prismu (pgbouncer=true).
 */
export function databaseUrl() {
  return (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// připojení vzniká až při prvním dotazu, import modulu (např. při buildu) databázi nepotřebuje
export const db = globalForPrisma.prisma ?? createPrismaClient(databaseUrl());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
