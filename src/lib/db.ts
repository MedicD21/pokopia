import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var __pokopiaPrisma: PrismaClient | undefined;
  var __pokopiaPgPool: Pool | undefined;
}

const databaseUrlEnvKeys = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

function getEnvironmentValue(key: (typeof databaseUrlEnvKeys)[number]) {
  const directValue = process.env[key];

  if (directValue && directValue.trim().length > 0) {
    return directValue;
  }

  const prefixedEntry = Object.entries(process.env).find(
    ([envKey, envValue]) => {
      return (
        envKey.endsWith(`_${key}`) &&
        typeof envValue === "string" &&
        envValue.trim().length > 0
      );
    },
  );

  return prefixedEntry?.[1] ?? null;
}

export function getDatabaseUrl() {
  for (const key of databaseUrlEnvKeys) {
    const value = getEnvironmentValue(key);

    if (value) {
      return value;
    }
  }

  return null;
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

const databaseUrl = getDatabaseUrl();

const pgPool = databaseUrl
  ? (global.__pokopiaPgPool ??
    new Pool({
      connectionString: databaseUrl,
    }))
  : null;

const pgAdapter = pgPool ? new PrismaPg(pgPool) : null;

export const prisma = databaseUrl
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
