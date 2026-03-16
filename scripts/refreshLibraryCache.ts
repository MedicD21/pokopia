import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";
import { Pool } from "pg";

interface RawItemCatalogSnapshot {
  generated_at?: string | null;
  total_items?: number;
  total_items_with_images?: number;
  total_items_with_location_entries?: number;
  categories?: Array<{ name: string; count: number }>;
  items?: unknown[];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required to refresh the item catalog cache.",
    );
  }

  const itemCatalogPath = path.join(
    process.cwd(),
    "storage",
    "pokopia-items-catalog.json",
  );

  const contents = await readFile(itemCatalogPath, "utf8");
  const payload = JSON.parse(contents) as RawItemCatalogSnapshot;

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error(
      "Item catalog file is empty. Run the scraper before refreshing the cache.",
    );
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  try {
    await prisma.itemCatalogCache.upsert({
      where: { id: "primary" },
      update: {
        payload: payload as unknown as Prisma.InputJsonValue,
      },
      create: {
        id: "primary",
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });

    console.log(
      `Refreshed item catalog cache with ${payload.items.length} raw entries (generated ${payload.generated_at ?? "unknown"}).`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to refresh the item catalog cache.", error);
  process.exitCode = 1;
});
