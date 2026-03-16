import "server-only";

import { PrismaClient } from "@prisma/client";

declare global {
  var __pokopiaPrisma: PrismaClient | undefined;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export const prisma =
  isDatabaseConfigured()
    ? global.__pokopiaPrisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      })
    : null;

if (prisma && process.env.NODE_ENV !== "production") {
  global.__pokopiaPrisma = prisma;
}
