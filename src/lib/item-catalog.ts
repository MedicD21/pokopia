import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db";
import type {
  ItemCatalogEntry,
  ItemCatalogHabitatEntry,
  ItemCatalogLocationEntry,
  ItemCatalogLocationKind,
  ItemCatalogSnapshot,
} from "@/lib/types";

const itemCatalogPath = path.join(
  process.cwd(),
  "storage",
  "pokopia-items-catalog.json",
);
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
  description?: string;
  tag?: string | null;
  tag_detail_url?: string | null;
  primary_image_url?: string | null;
  serebii_image_url?: string | null;
  location_summary?: string;
  location_entries?: RawItemCatalogLocationEntry[];
  obtain_method?: string | null;
  crafting_recipe?: string | null;
  habitats?: RawItemCatalogHabitatEntry[];
  source_urls?: {
    serebii?: string | null;
  };
}

interface RawItemCatalogSnapshot {
  generated_at?: string | null;
  sources?: {
    serebii_items?: string | null;
  };
  items?: RawItemCatalogEntry[];
}

const emptyCatalog: ItemCatalogSnapshot = {
  generatedAt: null,
  sources: {
    serebiiItems: null,
  },
  totalItems: 0,
  totalItemsWithImages: 0,
  totalItemsWithLocationEntries: 0,
  categories: [],
  items: [],
};

const furnitureSetRules: ReadonlyArray<[string, string]> = [
  ["poke ball", "Poke Ball furniture set"],
  ["poké ball", "Poke Ball furniture set"],
  ["pop art", "Pop art furniture set"],
  ["antique", "Antique furniture set"],
  ["berry", "Berry furniture set"],
  ["chic", "Chic furniture set"],
  ["cute", "Cute furniture set"],
  ["gaming", "Gaming furniture set"],
  ["garden", "Garden furniture set"],
  ["industrial", "Industrial furniture set"],
  ["iron", "Iron furniture set"],
  ["log", "Log furniture set"],
  ["luxury", "Luxury furniture set"],
  ["office", "Office furniture set"],
  ["plain", "Plain furniture set"],
  ["resort", "Resort furniture set"],
  ["stone", "Stone furniture set"],
  ["straw", "Straw furniture set"],
  ["wooden", "Wooden furniture set"],
  ["beach", "Beach furniture set"],
  ["flower", "Flower furniture set"],
];

const natureFamilyRules: ReadonlyArray<[string, string]> = [
  ["aspear", "Aspear nature set"],
  ["chesto", "Chesto nature set"],
  ["leppa", "Leppa nature set"],
  ["lum", "Lum nature set"],
  ["pecha", "Pecha nature set"],
  ["rawst", "Rawst nature set"],
  ["adorable", "Adorable hedge set"],
  ["damp", "Damp hedge set"],
  ["healthy", "Healthy hedge set"],
  ["stylish", "Stylish hedge set"],
  ["beautiful", "Beautiful flower set"],
  ["cute", "Cute flower set"],
  ["dandy", "Dandy flower set"],
  ["elegant", "Elegant flower set"],
  ["mountain", "Mountain flower set"],
  ["robust", "Robust flower set"],
  ["seashore", "Seashore flower set"],
  ["skyland", "Skyland flower set"],
  ["pointy tree", "Pointy tree set"],
  ["palm", "Palm tree set"],
];

const styleLabelRules: ReadonlyArray<[string, string]> = [
  ["antique", "Antique"],
  ["berry", "Berry"],
  ["beach", "Beach"],
  ["brick", "Brick"],
  ["city", "City"],
  ["chic", "Chic"],
  ["concrete", "Concrete"],
  ["cute", "Cute"],
  ["damaged", "Damaged"],
  ["dry", "Dry"],
  ["flower", "Flower"],
  ["gaming", "Gaming"],
  ["garden", "Garden"],
  ["glass", "Glass"],
  ["gray", "Gray"],
  ["industrial", "Industrial"],
  ["iron", "Iron"],
  ["leaf", "Leaf"],
  ["log", "Wood"],
  ["luxury", "Luxury"],
  ["metal", "Metal"],
  ["mushroom", "Mushroom"],
  ["orange", "Orange"],
  ["paint", "Paint"],
  ["poke ball", "Poke Ball"],
  ["pokemon center", "Pokemon Center"],
  ["pop art", "Pop art"],
  ["resort", "Resort"],
  ["roof", "Roof"],
  ["sand", "Sand"],
  ["seaweed", "Seaweed"],
  ["stone", "Stone"],
  ["straw", "Straw"],
  ["stylish", "Stylish"],
  ["tent", "Tent"],
  ["tiled", "Tiled"],
  ["tomato", "Tomato"],
  ["potato", "Potato"],
  ["wooden", "Wood"],
  ["yellow", "Yellow"],
  ["pink", "Pink"],
];

function normalizeMatchText(input: string) {
  return input
    .toLowerCase()
    .replaceAll("pokémon", "pokemon")
    .replaceAll("poké", "poke")
    .replace(/[\u2018\u2019]/g, "'");
}

function startsWithPhrase(input: string, phrase: string) {
  return (
    input === phrase ||
    input.startsWith(`${phrase} `) ||
    input.startsWith(`${phrase}-`) ||
    input.startsWith(`${phrase}(`)
  );
}

function addLabel(labels: Set<string>, label: string | null | undefined) {
  if (label) {
    labels.add(label);
  }
}

function inferFurnitureSet(name: string) {
  const normalized = normalizeMatchText(name);

  for (const [phrase, label] of furnitureSetRules) {
    if (startsWithPhrase(normalized, phrase)) {
      return label;
    }
  }

  return null;
}

function inferBuildingCollection(name: string) {
  const normalized = normalizeMatchText(name);

  if (startsWithPhrase(normalized, "iron pipe")) {
    return "Iron pipe set";
  }

  if (normalized.includes("iron") && !normalized.includes("iron pipe")) {
    return "Iron building set";
  }

  if (startsWithPhrase(normalized, "brick border")) {
    return "Brick border set";
  }

  if (startsWithPhrase(normalized, "concrete border")) {
    return "Concrete border set";
  }

  if (
    startsWithPhrase(normalized, "wooden border") ||
    startsWithPhrase(normalized, "wooden corner")
  ) {
    return "Wooden border set";
  }

  if (startsWithPhrase(normalized, "wooden siding")) {
    return "Wooden siding set";
  }

  if (startsWithPhrase(normalized, "arched barrier")) {
    return "Arched barrier set";
  }

  if (normalized.includes("simple curtain")) {
    return "Curtain set";
  }

  if (normalized.includes("pillar quarter")) {
    return "Pillar quarter set";
  }

  if (normalized.includes("roof")) {
    if (normalized.includes("brick")) {
      return "Brick roof set";
    }

    if (normalized.includes("stone")) {
      return "Stone roof set";
    }

    if (normalized.includes("tiled")) {
      return "Tiled roof set";
    }

    if (normalized.includes("tent")) {
      return "Tent roof set";
    }

    return "Roof set";
  }

  if (normalized.includes("stained-glass window")) {
    return "Stained-glass window set";
  }

  if (startsWithPhrase(normalized, "stone pillar")) {
    return "Stone pillar set";
  }

  if (startsWithPhrase(normalized, "wooden pillar")) {
    return "Wooden pillar set";
  }

  if (startsWithPhrase(normalized, "extravagant pillar")) {
    return "Extravagant pillar set";
  }

  if (startsWithPhrase(normalized, "round pillar")) {
    return "Round pillar set";
  }

  if (normalized.includes("door")) {
    return "Door collection";
  }

  if (normalized.includes("window")) {
    return "Window collection";
  }

  return null;
}

function inferBlockCollection(name: string) {
  const normalized = normalizeMatchText(name);

  if (startsWithPhrase(normalized, "light antique wall")) {
    return "Light antique wall set";
  }

  if (startsWithPhrase(normalized, "antique wall")) {
    return "Antique wall set";
  }

  if (startsWithPhrase(normalized, "confectionery wall")) {
    return "Confectionery wall set";
  }

  if (startsWithPhrase(normalized, "stylish brick wall")) {
    return "Stylish brick wall set";
  }

  if (startsWithPhrase(normalized, "copper deposit")) {
    return "Copper deposit set";
  }

  if (
    startsWithPhrase(normalized, "iron") ||
    normalized.includes("rusted iron")
  ) {
    return "Iron block set";
  }

  if (startsWithPhrase(normalized, "pokemon center")) {
    return "Pokemon Center block set";
  }

  if (startsWithPhrase(normalized, "barren")) {
    return "Barren terrain set";
  }

  if (startsWithPhrase(normalized, "damaged")) {
    return "Damaged surface set";
  }

  return null;
}

function inferNatureCollection(name: string) {
  const normalized = normalizeMatchText(name);

  for (const [phrase, label] of natureFamilyRules) {
    if (startsWithPhrase(normalized, phrase)) {
      return label;
    }
  }

  return null;
}

function inferUtilityCollection(name: string) {
  const normalized = normalizeMatchText(name);

  if (normalized.includes("meteor lamp")) {
    return "Meteor lamp set";
  }

  if (normalized.includes("music mat")) {
    return "Music mat set";
  }

  if (normalized.includes("streetlight")) {
    return "Streetlight set";
  }

  return null;
}

function inferOutdoorCollection(name: string) {
  const normalized = normalizeMatchText(name);

  if (normalized.includes("painting")) {
    return "Painting set";
  }

  if (normalized.includes("sign")) {
    return "Signage set";
  }

  if (normalized.includes("garden")) {
    return "Garden decor set";
  }

  return null;
}

function inferFoodCollection(name: string) {
  const normalized = normalizeMatchText(name);

  if (normalized.includes("soup")) {
    return "Soup recipes";
  }

  if (normalized.includes("salad")) {
    return "Salad recipes";
  }

  if (normalized.includes("bread")) {
    return "Bread recipes";
  }

  if (normalized.includes("hamburger steak")) {
    return "Hamburger steak recipes";
  }

  if (normalized.includes("berry")) {
    return "Berry foods";
  }

  return null;
}

function inferKitCollection(name: string) {
  const normalized = normalizeMatchText(name);

  if (normalized.includes("pokemon center kit")) {
    return "Pokemon Center kit set";
  }

  for (const phrase of [
    "city",
    "leaf",
    "sand",
    "stone",
    "gray",
    "orange",
    "pink",
    "yellow",
  ]) {
    if (startsWithPhrase(normalized, phrase)) {
      return `${phrase[0].toUpperCase()}${phrase.slice(1)} building kit set`;
    }
  }

  return null;
}

function inferMaterialCollection(name: string) {
  const normalized = normalizeMatchText(name);

  if (normalized.includes("paint")) {
    return "Paint set";
  }

  if (normalized.includes(" ore")) {
    return "Ore set";
  }

  if (normalized.includes("ingot")) {
    return "Ingot set";
  }

  if (normalized.includes("pokemetal")) {
    return "Poke Metal material set";
  }

  if (normalized.includes("fragment")) {
    return "Fragments set";
  }

  return null;
}

function inferOtherCollection(name: string) {
  const normalized = normalizeMatchText(name);

  if (normalized.includes("paint balloon")) {
    return "Paint balloon set";
  }

  if (normalized.includes("mysterious slate")) {
    return "Mysterious Slate set";
  }

  if (normalized.includes("iron") && normalized.includes("wallpaper")) {
    return "Iron wallpaper set";
  }

  return null;
}

function inferCollectionLabel(entry: ItemCatalogEntry) {
  switch (entry.primaryCategory) {
    case "Furniture":
      return inferFurnitureSet(entry.name);
    case "Buildings":
      return inferBuildingCollection(entry.name);
    case "Blocks":
      return inferBlockCollection(entry.name);
    case "Nature":
      return inferNatureCollection(entry.name);
    case "Utilities":
      return inferUtilityCollection(entry.name);
    case "Outdoor":
      return inferOutdoorCollection(entry.name);
    case "Food":
      return inferFoodCollection(entry.name);
    case "Kits":
      return inferKitCollection(entry.name);
    case "Materials":
      return inferMaterialCollection(entry.name);
    case "Other":
    case "Misc.":
      return inferOtherCollection(entry.name);
    default:
      return null;
  }
}

function matchTypeLabel(name: string, labels: ReadonlyArray<[string, string]>) {
  const normalized = normalizeMatchText(name);

  for (const [phrase, label] of labels) {
    if (normalized.includes(phrase)) {
      return label;
    }
  }

  return null;
}

function inferTypeLabel(entry: ItemCatalogEntry) {
  const commonName = entry.name;

  switch (entry.primaryCategory) {
    case "Furniture":
      return matchTypeLabel(commonName, [
        ["bed", "Bed"],
        ["chair", "Chair"],
        ["sofa", "Sofa"],
        ["table", "Table"],
        ["bench", "Bench"],
        ["dresser", "Dresser"],
        ["closet", "Closet"],
        ["chest", "Chest"],
        ["desk", "Desk"],
        ["counter", "Counter"],
        ["lamp", "Lamp"],
        ["chandelier", "Chandelier"],
        ["mirror", "Mirror"],
        ["rack", "Rack"],
        ["stand", "Stand"],
        ["case", "Storage"],
        ["box", "Storage"],
        ["cushion", "Cushion"],
        ["fridge", "Appliance"],
        ["pedestal", "Pedestal"],
      ]);
    case "Buildings":
      return matchTypeLabel(commonName, [
        ["roof", "Roof piece"],
        ["door", "Door"],
        ["window", "Window"],
        ["pillar", "Pillar"],
        ["pipe", "Pipe"],
        ["steps", "Steps"],
        ["border", "Border"],
        ["beam", "Beam"],
        ["column", "Column"],
        ["fencing", "Fence"],
        ["enclosure", "Fence"],
        ["ladder", "Ladder"],
        ["scaffold", "Scaffold"],
        ["flooring", "Floor piece"],
        ["awning", "Awning"],
        ["eave", "Eave"],
        ["bridge", "Bridge part"],
        ["railing", "Railing"],
        ["partition", "Partition"],
      ]);
    case "Blocks":
      return matchTypeLabel(commonName, [
        ["wall", "Wall block"],
        ["flooring", "Floor block"],
        ["tiling", "Tile block"],
        ["road", "Road block"],
        ["grass", "Grass block"],
        ["soil", "Soil block"],
        ["rock", "Rock block"],
        ["sand", "Sand block"],
        ["clay", "Clay block"],
        ["deposit", "Deposit block"],
        ["print", "Pattern block"],
        ["light", "Light block"],
        ["pillar", "Pillar block"],
      ]);
    case "Nature":
      return matchTypeLabel(commonName, [
        ["seeds", "Seeds"],
        ["tree stump", "Tree stump"],
        ["tree", "Tree"],
        ["hedge", "Hedge"],
        ["flower", "Flower"],
        ["plant", "Plant"],
        ["grass", "Grass"],
        ["vine", "Vine"],
        ["mushroom", "Mushroom"],
        ["rock", "Rock"],
        ["boulder", "Boulder"],
      ]);
    case "Utilities":
      return matchTypeLabel(commonName, [
        ["streetlight", "Streetlight"],
        ["lamp", "Lamp"],
        ["light", "Light"],
        ["furnace", "Furnace"],
        ["generator", "Generator"],
        ["platform", "Platform"],
        ["camera", "Camera"],
        ["sensor", "Sensor"],
        ["mat", "Music mat"],
        ["register", "Register"],
        ["card reader", "Reader"],
        ["pot", "Cooking"],
      ]);
    case "Outdoor":
      return matchTypeLabel(commonName, [
        ["sign", "Signage"],
        ["painting", "Painting"],
        ["chair", "Seating"],
        ["boat", "Boat"],
        ["bin", "Container"],
        ["barrel", "Container"],
        ["bag", "Container"],
        ["flowers", "Plant decor"],
        ["ornament", "Decor"],
        ["torch", "Lighting"],
        ["bonfire", "Campfire"],
        ["campfire", "Campfire"],
        ["slide", "Playground"],
        ["sandbox", "Playground"],
      ]);
    case "Food":
      return matchTypeLabel(commonName, [
        ["berry", "Berry"],
        ["bread", "Bread"],
        ["soup", "Soup"],
        ["salad", "Salad"],
        ["hamburger steak", "Hamburger steak"],
        ["milk", "Drink"],
        ["water", "Drink"],
        ["pop", "Drink"],
        ["tea", "Drink"],
        ["sauce", "Sauce"],
      ]);
    case "Kits":
      return "Building kit";
    case "Materials":
      return matchTypeLabel(commonName, [
        ["paint", "Paint"],
        ["ore", "Ore"],
        ["ingot", "Ingot"],
        ["fragment", "Fragment"],
        ["stone", "Resource"],
        ["clay", "Resource"],
        ["lumber", "Resource"],
        ["glass", "Resource"],
      ]);
    case "Fossils":
      return "Fossil";
    case "Key Items":
      return "Key item";
    case "Lost Relics (S)":
    case "Lost Relics (L)":
      return "Relic";
    default:
      return entry.tag;
  }
}

function inferLabels(
  entry: ItemCatalogEntry,
  collectionLabel: string | null,
  typeLabel: string | null,
) {
  const labels = new Set<string>();
  const normalizedName = normalizeMatchText(entry.name);
  const normalizedLocation = normalizeMatchText(entry.locationSummary);
  const normalizedDescription = normalizeMatchText(
    [entry.description, entry.obtainMethod, entry.craftingRecipe]
      .filter(Boolean)
      .join(" "),
  );

  addLabel(labels, entry.tag);
  addLabel(labels, typeLabel);

  if (collectionLabel) {
    addLabel(labels, collectionLabel);

    if (collectionLabel.includes("furniture set")) {
      addLabel(labels, "Furniture set");
    }

    if (collectionLabel.includes("kit set")) {
      addLabel(labels, "Kit set");
    }

    if (collectionLabel.includes("roof set")) {
      addLabel(labels, "Roof set");
    }

    if (collectionLabel.includes("iron")) {
      addLabel(labels, "Iron");
    }

    if (collectionLabel.includes("door")) {
      addLabel(labels, "Door collection");
    }

    if (collectionLabel.includes("window")) {
      addLabel(labels, "Window collection");
    }
  }

  for (const [phrase, label] of styleLabelRules) {
    if (
      normalizedName.includes(phrase) ||
      normalizedLocation.includes(phrase) ||
      normalizedDescription.includes(phrase)
    ) {
      addLabel(labels, label);
    }
  }

  if (entry.locationEntries.length > 0) {
    addLabel(labels, "Location listed");
  }

  if (entry.obtainMethod || entry.craftingRecipe) {
    addLabel(labels, "Crafting info");
  }

  if (entry.habitats.length > 0) {
    addLabel(labels, "Habitat linked");
  }

  switch (entry.primaryCategory) {
    case "Furniture":
      addLabel(labels, "Indoor");
      break;
    case "Outdoor":
      addLabel(labels, "Outdoor decor");
      break;
    case "Utilities":
      addLabel(labels, "Functional");
      break;
    case "Materials":
      addLabel(labels, "Crafting resource");
      break;
    case "Nature":
      addLabel(labels, "Natural");
      break;
    default:
      break;
  }

  return [...labels].sort((left, right) => left.localeCompare(right));
}

function enrichCatalogEntry(entry: ItemCatalogEntry): ItemCatalogEntry {
  const collectionLabel = inferCollectionLabel(entry);
  const typeLabel = inferTypeLabel(entry);

  return {
    ...entry,
    collectionLabel,
    typeLabel,
    labels: inferLabels(entry, collectionLabel, typeLabel),
  };
}

function canonicalizeCategory(category: string) {
  return category === "Furnitures" ? "Furniture" : category;
}

function categoryRank(category: string) {
  const normalized = canonicalizeCategory(category);
  const index = categoryOrder.indexOf(
    normalized as (typeof categoryOrder)[number],
  );
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
  const categoryComparison = compareCategories(
    left.primaryCategory,
    right.primaryCategory,
  );

  if (categoryComparison !== 0) {
    return categoryComparison;
  }

  return left.name.localeCompare(right.name);
}

function mapLocationEntry(
  raw: RawItemCatalogLocationEntry,
): ItemCatalogLocationEntry {
  return {
    label: raw.label ?? "",
    href: raw.href ?? null,
    qualifier: raw.qualifier ?? null,
    kind: raw.kind ?? "unknown",
    rawText: raw.raw_text ?? "",
    notes: raw.notes ?? null,
  };
}

function mapHabitatEntry(
  raw: RawItemCatalogHabitatEntry,
): ItemCatalogHabitatEntry {
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
    description: raw.description ?? "",
    tag: raw.tag ?? null,
    tagDetailUrl: raw.tag_detail_url ?? null,
    collectionLabel: null,
    typeLabel: null,
    labels: [],
    primaryImageUrl: raw.primary_image_url ?? raw.serebii_image_url ?? null,
    serebiiImageUrl: raw.serebii_image_url ?? null,
    locationSummary: raw.location_summary ?? "",
    locationEntries: (raw.location_entries ?? []).map(mapLocationEntry),
    obtainMethod: raw.obtain_method ?? null,
    craftingRecipe: raw.crafting_recipe ?? null,
    habitats: (raw.habitats ?? []).map(mapHabitatEntry),
    sourceUrls: {
      serebii: raw.source_urls?.serebii ?? null,
    },
  };
}

function mergeCatalogEntry(
  current: ItemCatalogEntry,
  incoming: ItemCatalogEntry,
): ItemCatalogEntry {
  return {
    ...current,
    description: current.description || incoming.description,
    tag: current.tag || incoming.tag,
    tagDetailUrl: current.tagDetailUrl || incoming.tagDetailUrl,
    collectionLabel: current.collectionLabel || incoming.collectionLabel,
    typeLabel: current.typeLabel || incoming.typeLabel,
    labels: uniqueByKey(
      [...current.labels, ...incoming.labels],
      (label) => label,
    ),
    primaryImageUrl: current.primaryImageUrl || incoming.primaryImageUrl,
    serebiiImageUrl: current.serebiiImageUrl || incoming.serebiiImageUrl,
    locationSummary: current.locationSummary || incoming.locationSummary,
    obtainMethod: current.obtainMethod || incoming.obtainMethod,
    craftingRecipe: current.craftingRecipe || incoming.craftingRecipe,
    habitats: uniqueByKey(
      [...current.habitats, ...incoming.habitats],
      (habitat) => habitat.slug || habitat.name,
    ),
    locationEntries: uniqueByKey(
      [...current.locationEntries, ...incoming.locationEntries],
      (entry) =>
        `${entry.kind}:${entry.label}:${entry.href ?? ""}:${entry.rawText}`,
    ),
    sourceUrls: {
      serebii: current.sourceUrls.serebii || incoming.sourceUrls.serebii,
    },
  };
}

function buildCategoryCounts(items: ItemCatalogEntry[]) {
  return [
    ...items.reduce((lookup, item) => {
      lookup.set(
        item.primaryCategory,
        (lookup.get(item.primaryCategory) ?? 0) + 1,
      );
      return lookup;
    }, new Map<string, number>()),
  ]
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

function buildSnapshot(
  rawCatalog: RawItemCatalogSnapshot,
): ItemCatalogSnapshot {
  const mappedItems = (rawCatalog.items ?? [])
    .map(mapCatalogEntry)
    .filter((item) => item.slug && item.name);
  const dedupedItems = [
    ...mappedItems
      .reduce((lookup, item) => {
        const key = `${item.primaryCategory}:${item.slug}`;
        const existing = lookup.get(key);

        lookup.set(key, existing ? mergeCatalogEntry(existing, item) : item);
        return lookup;
      }, new Map<string, ItemCatalogEntry>())
      .values(),
  ]
    .map(enrichCatalogEntry)
    .sort(sortCatalogItems);

  return {
    generatedAt: rawCatalog.generated_at ?? null,
    sources: {
      serebiiItems: rawCatalog.sources?.serebii_items ?? null,
    },
    totalItems: dedupedItems.length,
    totalItemsWithImages: dedupedItems.filter((item) => item.primaryImageUrl)
      .length,
    totalItemsWithLocationEntries: dedupedItems.filter(
      (item) => item.locationEntries.length > 0,
    ).length,
    categories: buildCategoryCounts(dedupedItems),
    items: dedupedItems,
  };
}

export async function listItemCatalog(): Promise<ItemCatalogSnapshot> {
  if (prisma) {
    try {
      const cachedSnapshot = await prisma.itemCatalogCache.findUnique({
        where: { id: "primary" },
      });

      if (cachedSnapshot?.payload) {
        return buildSnapshot(
          cachedSnapshot.payload as unknown as RawItemCatalogSnapshot,
        );
      }
    } catch {
      // Fall back to file storage below.
    }
  }

  try {
    const contents = await readFile(itemCatalogPath, "utf8");
    const rawCatalog = JSON.parse(contents) as RawItemCatalogSnapshot;
    return buildSnapshot(rawCatalog);
  } catch {
    return emptyCatalog;
  }
}
