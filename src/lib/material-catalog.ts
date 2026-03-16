import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { blockMaterials } from "@/data/materials";
import { prisma } from "@/lib/db";
import type { StorageMode } from "@/lib/types";

const scrapedMaterialsPath = path.join(process.cwd(), "storage", "materials-scraped.json");
const scrapedHabitatsPath = path.join(process.cwd(), "storage", "game8-habitats-scraped.json");

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
  slug?: string;
  name: string;
  category: string;
  obtain_method: string;
  crafting_recipe: string;
  location: string;
  notes: string;
  detail_url?: string;
  image_url?: string;
  summary?: string;
  linked_habitats?: ScrapedLinkedHabitatRecord[];
}

interface ScrapedHabitatRecord {
  slug?: string;
  name: string;
  dex_number: string;
  conditions: string[];
  pokemon_available: string[];
  detail_url?: string;
  image_url?: string;
  source_url?: string;
}

export interface HabitatCatalogEntry {
  slug: string;
  name: string;
  dexNumber: string | null;
  conditions: string[];
  pokemonAvailable: string[];
  detailUrl: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
}

export interface MaterialHabitatCatalogEntry extends HabitatCatalogEntry {
  reason: string;
}

export interface MaterialCatalogEntry {
  slug: string;
  name: string;
  category: string;
  obtainMethod: string;
  craftingRecipe: string;
  location: string;
  notes: string | null;
  detailUrl: string | null;
  imageUrl: string | null;
  summary: string | null;
  habitats: MaterialHabitatCatalogEntry[];
}

export interface MaterialCatalogSnapshot {
  materials: MaterialCatalogEntry[];
  habitats: HabitatCatalogEntry[];
  storageMode: StorageMode;
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

function compareDex(left: string | null, right: string | null) {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return left.localeCompare(right, undefined, {
    numeric: true,
  });
}

function compareHabitats(left: HabitatCatalogEntry, right: HabitatCatalogEntry) {
  const dexComparison = compareDex(left.dexNumber, right.dexNumber);

  if (dexComparison !== 0) {
    return dexComparison;
  }

  return left.name.localeCompare(right.name);
}

function buildFallbackCatalog(): MaterialCatalogSnapshot {
  return {
    materials: blockMaterials.map((material) => ({
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
      habitats: [],
    })),
    habitats: [],
    storageMode: "file",
  };
}

function mapScrapedHabitat(habitat: ScrapedHabitatRecord): HabitatCatalogEntry {
  return {
    slug: habitat.slug || slugify(habitat.name),
    name: habitat.name,
    dexNumber: habitat.dex_number || null,
    conditions: habitat.conditions ?? [],
    pokemonAvailable: habitat.pokemon_available ?? [],
    detailUrl: habitat.detail_url || null,
    imageUrl: habitat.image_url || null,
    sourceUrl: habitat.source_url || null,
  };
}

function mapScrapedLinkedHabitat(
  habitat: ScrapedLinkedHabitatRecord,
): MaterialHabitatCatalogEntry {
  return {
    ...mapScrapedHabitat(habitat),
    reason: habitat.match_reason,
  };
}

async function loadFileCatalog(): Promise<MaterialCatalogSnapshot> {
  const [scrapedMaterials, scrapedHabitats] = await Promise.all([
    readJsonFile<ScrapedMaterialRecord[]>(scrapedMaterialsPath),
    readJsonFile<ScrapedHabitatRecord[]>(scrapedHabitatsPath),
  ]);

  if (!scrapedMaterials || scrapedMaterials.length === 0) {
    return buildFallbackCatalog();
  }

  const materials = scrapedMaterials.map((material) => ({
    slug: material.slug || slugify(material.name),
    name: material.name,
    category: material.category,
    obtainMethod: material.obtain_method,
    craftingRecipe: material.crafting_recipe,
    location: material.location,
    notes: material.notes || null,
    detailUrl: material.detail_url || null,
    imageUrl: material.image_url || null,
    summary: material.summary || null,
    habitats: (material.linked_habitats ?? []).map(mapScrapedLinkedHabitat).sort(compareHabitats),
  }));

  const habitats =
    scrapedHabitats?.map(mapScrapedHabitat).sort(compareHabitats) ??
    Array.from(
      new Map(
        materials.flatMap((material) =>
          material.habitats.map((habitat) => [habitat.slug, habitat] as const),
        ),
      ).values(),
    ).sort(compareHabitats);

  return {
    materials,
    habitats,
    storageMode: "file",
  };
}

export async function listMaterialCatalog(): Promise<MaterialCatalogSnapshot> {
  if (!prisma) {
    return loadFileCatalog();
  }

  try {
    const [materials, habitats] = await Promise.all([
      prisma.material.findMany({
        orderBy: [{ category: "asc" }, { name: "asc" }],
        include: {
          habitats: {
            include: {
              habitat: true,
            },
          },
        },
      }),
      prisma.habitat.findMany(),
    ]);

    return {
      materials: materials.map((material) => ({
        slug: material.slug,
        name: material.name,
        category: material.category,
        obtainMethod: material.obtainMethod,
        craftingRecipe: material.craftingRecipe,
        location: material.location,
        notes: material.notes,
        detailUrl: material.detailUrl,
        imageUrl: material.imageUrl,
        summary: material.summary,
        habitats: material.habitats
          .map((link) => ({
            slug: link.habitat.slug,
            name: link.habitat.name,
            dexNumber: link.habitat.dexNumber,
            conditions: link.habitat.conditions,
            pokemonAvailable: link.habitat.pokemonAvailable,
            detailUrl: link.habitat.detailUrl,
            imageUrl: link.habitat.imageUrl,
            sourceUrl: link.habitat.sourceUrl,
            reason: link.reason,
          }))
          .sort(compareHabitats),
      })),
      habitats: habitats
        .map((habitat) => ({
          slug: habitat.slug,
          name: habitat.name,
          dexNumber: habitat.dexNumber,
          conditions: habitat.conditions,
          pokemonAvailable: habitat.pokemonAvailable,
          detailUrl: habitat.detailUrl,
          imageUrl: habitat.imageUrl,
          sourceUrl: habitat.sourceUrl,
        }))
        .sort(compareHabitats),
      storageMode: "database",
    };
  } catch {
    return loadFileCatalog();
  }
}
