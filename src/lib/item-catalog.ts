import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  ItemCatalogEntry,
  ItemCatalogHabitatEntry,
  ItemCatalogLocationEntry,
  ItemCatalogLocationKind,
  ItemCatalogSnapshot,
} from "@/lib/types";

const itemCatalogPath = path.join(process.cwd(), "storage", "pokopia-items-catalog.json");
const categoryOrder = [
  "Materials",
  "Blocks",
  "Buildings",
  "Furniture",
  "Nature",
  "Utilities",
  "Outdoor",
  "Food",
  "Kits",
  "Misc.",
  "Other",
  "Fossils",
  "Key Items",
  "Lost Relics (S)",
  "Lost Relics (L)",
] as const;

interface RawItemCatalogLocationEntry {
  label?: string;
  href?: string | null;
  qualifier?: string | null;
  kind?: ItemCatalogLocationKind;
  raw_text?: string;
  notes?: string | null;
}

interface RawItemCatalogHabitatEntry {
  slug?: string;
  name?: string;
  dex_number?: string | null;
  conditions?: string[];
  pokemon_available?: string[];
  detail_url?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  match_reason?: string;
}

interface RawItemCatalogEntry {
  slug?: string;
  name?: string;
  primary_category?: string;
  serebii_category?: string | null;
  game8_category?: string | null;
  description?: string;
  tag?: string | null;
  tag_detail_url?: string | null;
  primary_image_url?: string | null;
  serebii_image_url?: string | null;
  game8_image_url?: string | null;
  location_summary?: string;
  location_entries?: RawItemCatalogLocationEntry[];
  obtain_method?: string | null;
  crafting_recipe?: string | null;
  habitats?: RawItemCatalogHabitatEntry[];
  source_urls?: {
    serebii?: string | null;
    game8?: string | null;
  };
}

interface RawItemCatalogSnapshot {
  generated_at?: string | null;
  sources?: {
    game8_items?: string | null;
    game8_habitats?: string | null;
    serebii_items?: string | null;
  };
  items?: RawItemCatalogEntry[];
}

const emptyCatalog: ItemCatalogSnapshot = {
  generatedAt: null,
  sources: {
    game8Items: null,
    game8Habitats: null,
    serebiiItems: null,
  },
  totalItems: 0,
  totalItemsWithImages: 0,
  totalItemsWithLocationEntries: 0,
  categories: [],
  items: [],
};

function canonicalizeCategory(category: string) {
  return category === "Furnitures" ? "Furniture" : category;
}

function categoryRank(category: string) {
  const normalized = canonicalizeCategory(category);
  const index = categoryOrder.indexOf(normalized as (typeof categoryOrder)[number]);
  return index === -1 ? categoryOrder.length : index;
}

function compareCategories(left: string, right: string) {
  const leftRank = categoryRank(left);
  const rightRank = categoryRank(right);

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return canonicalizeCategory(left).localeCompare(canonicalizeCategory(right));
}

function uniqueByKey<T>(values: T[], getKey: (value: T) => string) {
  const uniqueValues = new Map<string, T>();

  values.forEach((value) => {
    const key = getKey(value);

    if (!key || uniqueValues.has(key)) {
      return;
    }

    uniqueValues.set(key, value);
  });

  return [...uniqueValues.values()];
}

function sortCatalogItems(left: ItemCatalogEntry, right: ItemCatalogEntry) {
  const categoryComparison = compareCategories(left.primaryCategory, right.primaryCategory);

  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  return left.name.localeCompare(right.name);
}

function mapLocationEntry(raw: RawItemCatalogLocationEntry): ItemCatalogLocationEntry {
  return {
    label: raw.label ?? "",
    href: raw.href ?? null,
    qualifier: raw.qualifier ?? null,
    kind: raw.kind ?? "unknown",
    rawText: raw.raw_text ?? "",
    notes: raw.notes ?? null,
  };
}

function mapHabitatEntry(raw: RawItemCatalogHabitatEntry): ItemCatalogHabitatEntry {
  return {
    slug: raw.slug ?? "",
    name: raw.name ?? "",
    dexNumber: raw.dex_number ?? null,
    conditions: raw.conditions ?? [],
    pokemonAvailable: raw.pokemon_available ?? [],
    detailUrl: raw.detail_url ?? null,
    imageUrl: raw.image_url ?? null,
    sourceUrl: raw.source_url ?? null,
    reason: raw.match_reason ?? "",
  };
}

function mapCatalogEntry(raw: RawItemCatalogEntry): ItemCatalogEntry {
  return {
    slug: raw.slug ?? "",
    name: raw.name ?? "",
    primaryCategory: canonicalizeCategory(raw.primary_category ?? "Other"),
    serebiiCategory: raw.serebii_category
      ? canonicalizeCategory(raw.serebii_category)
      : null,
    game8Category: raw.game8_category ? canonicalizeCategory(raw.game8_category) : null,
    description: raw.description ?? "",
    tag: raw.tag ?? null,
    tagDetailUrl: raw.tag_detail_url ?? null,
    primaryImageUrl: raw.primary_image_url ?? null,
    serebiiImageUrl: raw.serebii_image_url ?? null,
    game8ImageUrl: raw.game8_image_url ?? null,
    locationSummary: raw.location_summary ?? "",
    locationEntries: (raw.location_entries ?? []).map(mapLocationEntry),
    obtainMethod: raw.obtain_method ?? null,
    craftingRecipe: raw.crafting_recipe ?? null,
    habitats: (raw.habitats ?? []).map(mapHabitatEntry),
    sourceUrls: {
      serebii: raw.source_urls?.serebii ?? null,
      game8: raw.source_urls?.game8 ?? null,
    },
  };
}

function mergeCatalogEntry(current: ItemCatalogEntry, incoming: ItemCatalogEntry): ItemCatalogEntry {
  return {
    ...current,
    description: current.description || incoming.description,
    tag: current.tag || incoming.tag,
    tagDetailUrl: current.tagDetailUrl || incoming.tagDetailUrl,
    primaryImageUrl: current.primaryImageUrl || incoming.primaryImageUrl,
    serebiiImageUrl: current.serebiiImageUrl || incoming.serebiiImageUrl,
    game8ImageUrl: current.game8ImageUrl || incoming.game8ImageUrl,
    locationSummary: current.locationSummary || incoming.locationSummary,
    obtainMethod: current.obtainMethod || incoming.obtainMethod,
    craftingRecipe: current.craftingRecipe || incoming.craftingRecipe,
    habitats: uniqueByKey(
      [...current.habitats, ...incoming.habitats],
      (habitat) => habitat.slug || habitat.name,
    ),
    locationEntries: uniqueByKey(
      [...current.locationEntries, ...incoming.locationEntries],
      (entry) => `${entry.kind}:${entry.label}:${entry.href ?? ""}:${entry.rawText}`,
    ),
    sourceUrls: {
      serebii: current.sourceUrls.serebii || incoming.sourceUrls.serebii,
      game8: current.sourceUrls.game8 || incoming.sourceUrls.game8,
    },
  };
}

function buildCategoryCounts(items: ItemCatalogEntry[]) {
  return [...items.reduce((lookup, item) => {
    lookup.set(item.primaryCategory, (lookup.get(item.primaryCategory) ?? 0) + 1);
    return lookup;
  }, new Map<string, number>())]
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((left, right) => {
      const categoryComparison = compareCategories(left.name, right.name);

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return left.name.localeCompare(right.name);
    });
}

export async function listItemCatalog(): Promise<ItemCatalogSnapshot> {
  try {
    const contents = await readFile(itemCatalogPath, "utf8");
    const rawCatalog = JSON.parse(contents) as RawItemCatalogSnapshot;
    const mappedItems = (rawCatalog.items ?? [])
      .map(mapCatalogEntry)
      .filter((item) => item.slug && item.name);
    const dedupedItems = [...mappedItems.reduce((lookup, item) => {
      const key = `${item.primaryCategory}:${item.slug}`;
      const existing = lookup.get(key);

      lookup.set(key, existing ? mergeCatalogEntry(existing, item) : item);
      return lookup;
    }, new Map<string, ItemCatalogEntry>()).values()].sort(sortCatalogItems);

    return {
      generatedAt: rawCatalog.generated_at ?? null,
      sources: {
        game8Items: rawCatalog.sources?.game8_items ?? null,
        game8Habitats: rawCatalog.sources?.game8_habitats ?? null,
        serebiiItems: rawCatalog.sources?.serebii_items ?? null,
      },
      totalItems: dedupedItems.length,
      totalItemsWithImages: dedupedItems.filter((item) => item.primaryImageUrl).length,
      totalItemsWithLocationEntries: dedupedItems.filter(
        (item) => item.locationEntries.length > 0,
      ).length,
      categories: buildCategoryCounts(dedupedItems),
      items: dedupedItems,
    };
  } catch {
    return emptyCatalog;
  }
}
