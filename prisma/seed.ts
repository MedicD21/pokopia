import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";
import { Pool } from "pg";

import { blockMaterials } from "../src/data/materials";
import { pokemonHelpers } from "../src/data/pokemon-helpers";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});
const scrapedMaterialsPath = path.join(process.cwd(), "storage", "materials-scraped.json");
const scrapedHabitatsPath = path.join(process.cwd(), "storage", "game8-habitats-scraped.json");
const itemCatalogPath = path.join(process.cwd(), "storage", "pokopia-items-catalog.json");

interface ScrapedLinkedHabitatRecord {
  slug: string;
  name: string;
  dex_number: string;
  conditions: string[];
  pokemon_available: string[];
  detail_url: string;
  image_url: string;
  source_url: string;
  match_reason: string;
}

interface ScrapedMaterialRecord {
  slug: string;
  name: string;
  category: string;
  obtain_method: string;
  crafting_recipe: string;
  location: string;
  notes: string;
  detail_url: string;
  image_url: string;
  summary: string;
  linked_habitats?: ScrapedLinkedHabitatRecord[];
}

interface ScrapedHabitatRecord {
  slug: string;
  name: string;
  dex_number: string;
  conditions: string[];
  pokemon_available: string[];
  detail_url: string;
  image_url: string;
  source_url: string;
}

interface RawItemCatalogSnapshot {
  generated_at?: string | null;
  sources?: {
    game8_items?: string | null;
    game8_habitats?: string | null;
    serebii_items?: string | null;
  };
  total_items?: number;
  total_items_with_images?: number;
  total_items_with_location_entries?: number;
  categories?: Array<{ name: string; count: number }>;
  items?: unknown[];
}

interface SeedMaterialRecord {
  slug: string;
  name: string;
  category: string;
  obtainMethod: string;
  craftingRecipe: string;
  location: string;
  notes: string;
  detailUrl: string | null;
  imageUrl: string | null;
  summary: string | null;
  linkedHabitats: ScrapedLinkedHabitatRecord[];
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readJsonFile<T>(filePath: string) {
  try {
    const contents = await readFile(filePath, "utf8");
    return JSON.parse(contents) as T;
  } catch {
    return null;
  }
}

function fallbackMaterialSeedData(): SeedMaterialRecord[] {
  return blockMaterials.map((material) => ({
    slug: material.id,
    name: material.displayName,
    category: material.category,
    obtainMethod: material.obtainMethod,
    craftingRecipe: material.craftingRecipe,
    location: material.location,
    notes: material.notes,
    detailUrl: null,
    imageUrl: null,
    summary: null,
    linkedHabitats: [],
  }));
}

async function loadSeedMaterials() {
  const scrapedMaterials = await readJsonFile<ScrapedMaterialRecord[]>(scrapedMaterialsPath);

  if (!scrapedMaterials || scrapedMaterials.length === 0) {
    return fallbackMaterialSeedData();
  }

  return scrapedMaterials.map((material) => ({
    slug: material.slug || slugify(material.name),
    name: material.name,
    category: material.category,
    obtainMethod: material.obtain_method,
    craftingRecipe: material.crafting_recipe,
    location: material.location,
    notes: material.notes,
    detailUrl: material.detail_url || null,
    imageUrl: material.image_url || null,
    summary: material.summary || null,
    linkedHabitats: material.linked_habitats ?? [],
  }));
}

async function loadSeedHabitats() {
  return (await readJsonFile<ScrapedHabitatRecord[]>(scrapedHabitatsPath)) ?? [];
}

async function loadItemCatalogSnapshot() {
  return await readJsonFile<RawItemCatalogSnapshot>(itemCatalogPath);
}

async function main() {
  const [materials, habitats, itemCatalog] = await Promise.all([
    loadSeedMaterials(),
    loadSeedHabitats(),
    loadItemCatalogSnapshot(),
  ]);
  const habitatIdBySlug = new Map<string, string>();
  const materialIdBySlug = new Map<string, string>();

  for (const habitat of habitats) {
    const record = await prisma.habitat.upsert({
      where: { slug: habitat.slug },
      update: {
        name: habitat.name,
        dexNumber: habitat.dex_number || null,
        conditions: habitat.conditions,
        pokemonAvailable: habitat.pokemon_available,
        detailUrl: habitat.detail_url || null,
        imageUrl: habitat.image_url || null,
        sourceUrl: habitat.source_url || null,
      },
      create: {
        slug: habitat.slug,
        name: habitat.name,
        dexNumber: habitat.dex_number || null,
        conditions: habitat.conditions,
        pokemonAvailable: habitat.pokemon_available,
        detailUrl: habitat.detail_url || null,
        imageUrl: habitat.image_url || null,
        sourceUrl: habitat.source_url || null,
      },
    });

    habitatIdBySlug.set(record.slug, record.id);
  }

  for (const material of materials) {
    const record = await prisma.material.upsert({
      where: { slug: material.slug },
      update: {
        name: material.name,
        category: material.category,
        obtainMethod: material.obtainMethod,
        craftingRecipe: material.craftingRecipe,
        location: material.location,
        detailUrl: material.detailUrl,
        imageUrl: material.imageUrl,
        summary: material.summary,
        notes: material.notes,
      },
      create: {
        slug: material.slug,
        name: material.name,
        category: material.category,
        obtainMethod: material.obtainMethod,
        craftingRecipe: material.craftingRecipe,
        location: material.location,
        detailUrl: material.detailUrl,
        imageUrl: material.imageUrl,
        summary: material.summary,
        notes: material.notes,
      },
    });

    materialIdBySlug.set(record.slug, record.id);
  }

  await prisma.materialHabitat.deleteMany();

  const materialHabitatLinks = materials.flatMap((material) =>
    material.linkedHabitats
      .map((habitatLink) => {
        const materialId = materialIdBySlug.get(material.slug);
        const habitatId = habitatIdBySlug.get(habitatLink.slug);

        if (!materialId || !habitatId) {
          return null;
        }

        return {
          materialId,
          habitatId,
          reason: habitatLink.match_reason,
        };
      })
      .filter((link): link is { materialId: string; habitatId: string; reason: string } =>
        Boolean(link),
      ),
  );

  if (materialHabitatLinks.length > 0) {
    await prisma.materialHabitat.createMany({
      data: materialHabitatLinks,
    });
  }

  for (const helper of pokemonHelpers) {
    await prisma.pokemonHelper.upsert({
      where: { id: helper.id },
      update: {
        pokemonName: helper.pokemonName,
        type: helper.type,
        buildSkill: helper.buildSkill,
        description: helper.description,
        specialties: helper.specialties,
      },
      create: {
        id: helper.id,
        pokemonName: helper.pokemonName,
        type: helper.type,
        buildSkill: helper.buildSkill,
        description: helper.description,
        specialties: helper.specialties,
      },
    });
  }

  if (itemCatalog) {
    await prisma.itemCatalogCache.upsert({
      where: { id: "primary" },
      update: {
        payload: itemCatalog as unknown as Prisma.InputJsonValue,
      },
      create: {
        id: "primary",
        payload: itemCatalog as unknown as Prisma.InputJsonValue,
      },
    });
  }

  console.log(
    `Seeded ${materials.length} materials, ${habitats.length} habitats, ${materialHabitatLinks.length} material-habitat links, ${pokemonHelpers.length} helper records, and ${itemCatalog?.items?.length ?? 0} item catalog entries.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed the database.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
