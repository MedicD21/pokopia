import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var __pokopiaPrisma: PrismaClient | undefined;
  var __pokopiaPgPool: Pool | undefined;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

const pgPool =
  isDatabaseConfigured() && process.env.DATABASE_URL
    ? (global.__pokopiaPgPool ??
      new Pool({
        connectionString: process.env.DATABASE_URL,
      }))
    : null;

const pgAdapter = pgPool ? new PrismaPg(pgPool) : null;

export const prisma = isDatabaseConfigured()
  ? (global.__pokopiaPrisma ??
    new PrismaClient({
      adapter: pgAdapter ?? undefined,
      log:
        process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }))
  : null;

if (prisma && process.env.NODE_ENV !== "production") {
  global.__pokopiaPrisma = prisma;
}

if (pgPool && process.env.NODE_ENV !== "production") {
  global.__pokopiaPgPool = pgPool;
}
