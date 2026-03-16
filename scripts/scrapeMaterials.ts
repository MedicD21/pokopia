import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const defaultGame8ItemsSourceUrl =
  "https://game8.co/games/Pokemon-Pokopia/archives/584741";
const defaultGame8HabitatSourceUrl =
  "https://game8.co/games/Pokemon-Pokopia/archives/582463";
const defaultSerebiiItemsSourceUrl =
  "https://www.serebii.net/pokemonpokopia/items.shtml";
const game8ItemsSourceUrl = process.argv[2] ?? defaultGame8ItemsSourceUrl;
const game8HabitatSourceUrl = process.argv[3] ?? defaultGame8HabitatSourceUrl;
const serebiiItemsSourceUrl = process.argv[4] ?? defaultSerebiiItemsSourceUrl;
const outputDir = path.join(process.cwd(), "storage");
const allGame8ItemsOutputPath = path.join(outputDir, "game8-items-scraped.json");
const materialsOutputPath = path.join(outputDir, "materials-scraped.json");
const habitatsOutputPath = path.join(outputDir, "game8-habitats-scraped.json");
const serebiiItemsOutputPath = path.join(outputDir, "serebii-items-scraped.json");
const unifiedCatalogOutputPath = path.join(outputDir, "pokopia-items-catalog.json");
const maxConcurrency = 6;

interface ListItemRecord {
  name: string;
  category: string;
  detail_url: string;
  image_url: string;
  source_url: string;
}

interface GuideSection {
  title: string;
  paragraphs: string[];
}

interface HabitatRecord {
  slug: string;
  name: string;
  dex_number: string;
  conditions: string[];
  pokemon_available: string[];
  detail_url: string;
  image_url: string;
  source_url: string;
  scraped_at: string;
}

interface LinkedHabitatRecord extends HabitatRecord {
  match_reason: string;
}

interface ScrapedItemRecord extends ListItemRecord {
  slug: string;
  summary: string;
  obtain_method: string;
  crafting_recipe: string;
  location: string;
  notes: string;
  how_to_get_sections: GuideSection[];
  how_to_use_sections: GuideSection[];
  scraped_at: string;
  scrape_error?: string;
}

type SerebiiLocationKind =
  | "location"
  | "dream_island"
  | "build_kit"
  | "recipe"
  | "trade"
  | "exchange"
  | "appraisal"
  | "processing"
  | "method"
  | "linked"
  | "unknown";

interface SerebiiLocationEntry {
  label: string;
  href: string | null;
  qualifier: string | null;
  kind: SerebiiLocationKind;
  raw_text: string;
  notes: string | null;
}

interface SerebiiItemRecord {
  slug: string;
  anchor: string;
  category: string;
  name: string;
  description: string;
  tag: string | null;
  tag_detail_url: string | null;
  image_url: string;
  location_summary: string;
  location_entries: SerebiiLocationEntry[];
  source_url: string;
  scraped_at: string;
}

interface SerebiiItemSnapshot {
  source_url: string;
  scraped_at: string;
  total_items: number;
  categories: Array<{ name: string; count: number }>;
  items: SerebiiItemRecord[];
}

interface MaterialSnapshotRecord {
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
  how_to_get_sections: GuideSection[];
  how_to_use_sections: GuideSection[];
  linked_habitats: LinkedHabitatRecord[];
  serebii_category: string | null;
  serebii_description: string | null;
  serebii_location_summary: string | null;
  serebii_locations: SerebiiLocationEntry[];
  serebii_image_url: string | null;
}

interface UnifiedItemCatalogRecord {
  slug: string;
  name: string;
  primary_category: string;
  serebii_category: string | null;
  game8_category: string | null;
  description: string;
  tag: string | null;
  tag_detail_url: string | null;
  primary_image_url: string | null;
  serebii_image_url: string | null;
  game8_image_url: string | null;
  location_summary: string;
  location_entries: SerebiiLocationEntry[];
  obtain_method: string | null;
  crafting_recipe: string | null;
  habitats: LinkedHabitatRecord[];
  source_urls: {
    serebii: string | null;
    game8: string | null;
  };
}

interface UnifiedItemCatalogSnapshot {
  generated_at: string;
  sources: {
    game8_items: string;
    game8_habitats: string;
    serebii_items: string;
  };
  total_items: number;
  total_items_with_images: number;
  total_items_with_location_entries: number;
  categories: Array<{ name: string; count: number }>;
  items: UnifiedItemCatalogRecord[];
}

const namedHtmlEntities: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  eacute: "\u00e9",
  Eacute: "\u00c9",
  aacute: "\u00e1",
  Aacute: "\u00c1",
  iacute: "\u00ed",
  Iacute: "\u00cd",
  oacute: "\u00f3",
  Oacute: "\u00d3",
  uacute: "\u00fa",
  Uacute: "\u00da",
  agrave: "\u00e0",
  Agrave: "\u00c0",
  egrave: "\u00e8",
  Egrave: "\u00c8",
  igrave: "\u00ec",
  Igrave: "\u00cc",
  ograve: "\u00f2",
  Ograve: "\u00d2",
  ugrave: "\u00f9",
  Ugrave: "\u00d9",
  acirc: "\u00e2",
  Acirc: "\u00c2",
  ecirc: "\u00ea",
  Ecirc: "\u00ca",
  icirc: "\u00ee",
  Icirc: "\u00ce",
  ocirc: "\u00f4",
  Ocirc: "\u00d4",
  ucirc: "\u00fb",
  Ucirc: "\u00db",
  uml: "\u00a8",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
};

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&([a-zA-Z]+);/g, (match, entityName) => namedHtmlEntities[entityName] ?? match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function normalizeWhitespace(input: string) {
  return decodeHtmlEntities(input.replace(/\u00a0/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(input: string) {
  return normalizeWhitespace(
    input
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function stripHtmlToLines(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<hr[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

function splitHtmlLines(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function truncate(input: string, maxLength = 320) {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, maxLength - 1).trimEnd()}...`;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function slugify(input: string) {
  return normalizeWhitespace(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeForMatch(input: string) {
  return normalizeWhitespace(input).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function toAbsoluteUrl(url: string, pageUrl: string) {
  try {
    return new URL(url, pageUrl).toString();
  } catch {
    return url;
  }
}

function sortCategoryCounts(items: Array<{ category: string }>) {
  return [...items.reduce((lookup, item) => {
    lookup.set(item.category, (lookup.get(item.category) ?? 0) + 1);
    return lookup;
  }, new Map<string, number>())]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name);
    });
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "PokopiaPlannerBot/1.0 (+local development scraper)",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }

  return response.text();
}

function extractH2SectionByTitle(html: string, heading: string) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<h2 class=['"]a-header--2['"] id=['"][^'"]+['"]>${escapedHeading}<\\/h2>([\\s\\S]*?)(?=<h2 class=['"]a-header--2['"] id=['"][^'"]+['"]>|$)`,
    "i",
  );
  const match = html.match(regex)?.[1];

  if (!match) {
    throw new Error(`Unable to find the "${heading}" section on the source page.`);
  }

  return match;
}

function extractGame8ItemIndexMarkup(html: string) {
  return extractH2SectionByTitle(html, "List of All Items");
}

function parseGame8ItemIndex(indexMarkup: string, pageUrl: string) {
  const sectionRegex =
    /<h3 class=['"]a-header--3['"] id=['"][^'"]+['"]>(.*?)<\/h3>([\s\S]*?)(?=<h3 class=['"]a-header--3['"] id=['"][^'"]+['"]>|$)/g;
  const itemRegex =
    /<a class=['"]a-link['"] href=(https:\/\/game8\.co\/games\/Pokemon-Pokopia\/archives\/\d+)><img[\s\S]*?alt=['"]([^'"]+)['"][\s\S]*?data-src=['"]([^'"]+)['"][\s\S]*?\/>\s*([^<]+)<\/a>/g;

  const parsedItems: ListItemRecord[] = [];
  const seen = new Set<string>();

  for (const sectionMatch of indexMarkup.matchAll(sectionRegex)) {
    const category = stripTags(sectionMatch[1]);
    const sectionBody = sectionMatch[2];

    if (!category || category === "Pokemon Pokopia Guides by Category") {
      continue;
    }

    for (const itemMatch of sectionBody.matchAll(itemRegex)) {
      const detailUrl = itemMatch[1];
      const imageUrl = itemMatch[3];
      const name = normalizeWhitespace(itemMatch[4]) || normalizeWhitespace(itemMatch[2]);
      const key = `${category}:${name}`;

      if (!name || seen.has(key)) {
        continue;
      }

      seen.add(key);
      parsedItems.push({
        name,
        category,
        detail_url: detailUrl,
        image_url: imageUrl,
        source_url: pageUrl,
      });
    }
  }

  return parsedItems;
}

function extractMetaDescription(html: string) {
  const match = html.match(/<meta content="([^"]+)" name="description" \/>/i);
  return match ? normalizeWhitespace(match[1]) : "";
}

function extractGuideH2Section(html: string, headingPrefix: string) {
  const regex = new RegExp(
    `<h2 class=['"]a-header--2['"] id=['"][^'"]+['"]>${headingPrefix}[^<]*<\\/h2>([\\s\\S]*?)(?=<h2 class=['"]a-header--2['"] id=['"][^'"]+['"]>|$)`,
    "i",
  );

  return html.match(regex)?.[1] ?? "";
}

function parseGuideSections(sectionMarkup: string) {
  const subsectionRegex =
    /<h3 class=['"]a-header--3['"] id=['"][^'"]+['"]>(.*?)<\/h3>([\s\S]*?)(?=<h3 class=['"]a-header--3['"] id=['"][^'"]+['"]>|$)/g;
  const paragraphRegex = /<p class=['"]a-paragraph['"]>([\s\S]*?)<\/p>/g;
  const sections: GuideSection[] = [];

  for (const subsectionMatch of sectionMarkup.matchAll(subsectionRegex)) {
    const title = stripTags(subsectionMatch[1]);
    const subsectionBody = subsectionMatch[2];
    const paragraphs = [...subsectionBody.matchAll(paragraphRegex)]
      .map((paragraphMatch) => paragraphMatch[1])
      .filter((paragraphHtml) => !paragraphHtml.includes("class='a-btn'"))
      .map((paragraphHtml) => stripTags(paragraphHtml))
      .filter(Boolean);

    if (title || paragraphs.length > 0) {
      sections.push({
        title: title || "Overview",
        paragraphs,
      });
    }
  }

  if (sections.length > 0) {
    return sections;
  }

  const standaloneParagraphs = [...sectionMarkup.matchAll(paragraphRegex)]
    .map((match) => match[1])
    .filter((paragraphHtml) => !paragraphHtml.includes("class='a-btn'"))
    .map((paragraphHtml) => stripTags(paragraphHtml))
    .filter(Boolean);

  if (standaloneParagraphs.length === 0) {
    return [];
  }

  return [
    {
      title: "Overview",
      paragraphs: standaloneParagraphs,
    },
  ];
}

function flattenSections(sections: GuideSection[]) {
  return sections
    .map((section) =>
      [section.title, ...section.paragraphs].filter(Boolean).join(": ").trim(),
    )
    .filter(Boolean)
    .join(" | ");
}

function deriveCraftingRecipe(category: string, howToUseSections: GuideSection[]) {
  const howToUse = flattenSections(howToUseSections);

  if (howToUse) {
    return howToUse;
  }

  if (category === "Materials") {
    return "No crafting recipe was listed on the source page.";
  }

  return "No crafting or usage recipe was listed on the source page.";
}

function deriveLocation(howToGetSections: GuideSection[]) {
  if (howToGetSections.length === 0) {
    return "Location details were not listed on the source page.";
  }

  return howToGetSections
    .map((section) =>
      section.paragraphs[0] ? `${section.title}: ${section.paragraphs[0]}` : section.title,
    )
    .join(" | ");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function extractHabitatIndexMarkup(html: string) {
  return extractH2SectionByTitle(html, "Habitat Dex: List of All Habitats");
}

function parseHabitats(indexMarkup: string, pageUrl: string) {
  const tbodyMarkup = indexMarkup.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1];

  if (!tbodyMarkup) {
    throw new Error("Unable to find the habitat table body on the source page.");
  }

  const rows = tbodyMarkup.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
  const habitats: HabitatRecord[] = [];
  const scrapedAt = new Date().toISOString();

  for (let index = 0; index < rows.length; index += 2) {
    const contentRow = rows[index];
    const metaRow = rows[index + 1];

    if (!contentRow || !metaRow) {
      continue;
    }

    const imageMatch = contentRow.match(
      /alt=['"]([^'"]+)['"][\s\S]*?data-src=['"]([^'"]+)['"]/i,
    );
    const conditionsMarkup =
      contentRow.match(
        /<b class=['"]a-bold['"]>Conditions<\/b>:\s*<br>\s*([\s\S]*?)<hr class=['"]a-table__line['"]>/i,
      )?.[1] ?? "";
    const pokemonMarkup =
      contentRow.match(
        /<b class=['"]a-bold['"]>Pokemon Available<\/b>:\s*<br>\s*([\s\S]*?)<\/td>/i,
      )?.[1] ?? "";
    const detailMatch = metaRow.match(
      /<a class=['"]a-link['"] href=(https:\/\/game8\.co\/games\/Pokemon-Pokopia\/archives\/\d+)>([^<]+)<\/a>/i,
    );
    const dexMatch = metaRow.match(
      /\(#(?:<b class=['"]a-bold['"]>)?([^<)]+)(?:<\/b>)?\)/i,
    );
    const name = normalizeWhitespace(detailMatch?.[2] ?? imageMatch?.[1] ?? "");

    if (!name) {
      continue;
    }

    habitats.push({
      slug: slugify(name),
      name,
      dex_number: normalizeWhitespace(dexMatch?.[1] ?? ""),
      conditions: stripHtmlToLines(conditionsMarkup),
      pokemon_available: uniqueStrings(
        [...pokemonMarkup.matchAll(/alt=['"]([^'"]+)['"]/g)].map((match) =>
          normalizeWhitespace(match[1]),
        ),
      ),
      detail_url: detailMatch?.[1] ?? "",
      image_url: imageMatch?.[2] ?? "",
      source_url: pageUrl,
      scraped_at: scrapedAt,
    });
  }

  return habitats;
}

async function scrapeGame8Detail(item: ListItemRecord): Promise<ScrapedItemRecord> {
  try {
    const html = await fetchHtml(item.detail_url);
    const summary = extractMetaDescription(html);
    const howToGetSections = parseGuideSections(extractGuideH2Section(html, "How to Get"));
    const howToUseSections = parseGuideSections(extractGuideH2Section(html, "How to Use"));
    const obtainMethod =
      flattenSections(howToGetSections) || "No obtain method was listed on the source page.";
    const craftingRecipe = deriveCraftingRecipe(item.category, howToUseSections);
    const location = deriveLocation(howToGetSections);

    return {
      ...item,
      slug: slugify(item.name),
      summary,
      obtain_method: truncate(obtainMethod, 500),
      crafting_recipe: truncate(craftingRecipe, 500),
      location,
      notes: truncate(
        [summary, `Detail page: ${item.detail_url}`].filter(Boolean).join(" "),
        500,
      ),
      how_to_get_sections: howToGetSections,
      how_to_use_sections: howToUseSections,
      scraped_at: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ...item,
      slug: slugify(item.name),
      summary: "",
      obtain_method: "Unable to extract obtain method from the detail page.",
      crafting_recipe: "Unable to extract crafting or usage details from the detail page.",
      location: "Unable to extract location details from the detail page.",
      notes: `Detail page scrape failed: ${message}`,
      how_to_get_sections: [],
      how_to_use_sections: [],
      scraped_at: new Date().toISOString(),
      scrape_error: message,
    };
  }
}

function deriveSerebiiLocationKind(href: string | null, rawText: string): SerebiiLocationKind {
  const normalizedText = normalizeForMatch(rawText);

  if (href?.includes("/pokemonpokopia/locations/")) {
    return "location";
  }

  if (href?.includes("/pokemonpokopia/dreamisland/")) {
    return "dream_island";
  }

  if (href?.includes("/pokemonpokopia/build/")) {
    return "build_kit";
  }

  if (href?.includes("/pokemonpokopia/crafting.shtml")) {
    return "recipe";
  }

  if (normalizedText.includes("trade with")) {
    return "trade";
  }

  if (normalizedText.includes("pokemon center exchange")) {
    return "exchange";
  }

  if (normalizedText.includes("appraise from a relic")) {
    return "appraisal";
  }

  if (
    normalizedText.startsWith("smelt ") ||
    normalizedText.startsWith("crush ") ||
    normalizedText.startsWith("mix ") ||
    normalizedText.startsWith("recycle ") ||
    normalizedText.startsWith("give ")
  ) {
    return "processing";
  }

  if (href) {
    return "linked";
  }

  if (normalizedText.length > 0) {
    return "method";
  }

  return "unknown";
}

function parseSerebiiLocationEntries(markup: string, pageUrl: string) {
  return splitHtmlLines(markup).map((lineMarkup) => {
    const line = lineMarkup.trim();
    const rawText = stripTags(line);
    const linkMatch = line.match(/<a [^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i);
    const linkLabel = linkMatch ? stripTags(linkMatch[2]) : null;
    const href = linkMatch ? toAbsoluteUrl(linkMatch[1], pageUrl) : null;
    const remainderMarkup = linkMatch ? line.replace(linkMatch[0], "").trim() : "";
    const remainderText = stripTags(remainderMarkup);
    const qualifier = remainderText.match(/\(([^)]+)\)/)?.[1] ?? null;
    const notes = remainderText.replace(/\([^)]+\)/g, "").trim() || null;
    const shouldAppendNotesToLabel =
      notes !== null && href !== null && notes.toLowerCase().startsWith("dream island");
    const label = linkLabel
      ? [linkLabel, shouldAppendNotesToLabel ? notes : null].filter(Boolean).join(" ")
      : rawText;

    return {
      label,
      href,
      qualifier,
      kind: deriveSerebiiLocationKind(href, rawText),
      raw_text: rawText,
      notes: shouldAppendNotesToLabel ? null : notes,
    };
  });
}

function parseSerebiiItems(html: string, pageUrl: string): SerebiiItemSnapshot {
  const sectionRegex =
    /<p>\s*<h2><a name="([^"]*)"><\/a>List of ([\s\S]*?)<\/h2><\/p>\s*<table class="dextable" align="center">([\s\S]*?)<\/table>/gi;
  const items: SerebiiItemRecord[] = [];
  const scrapedAt = new Date().toISOString();

  for (const sectionMatch of html.matchAll(sectionRegex)) {
    const anchor = normalizeWhitespace(sectionMatch[1]);
    const category = normalizeWhitespace(sectionMatch[2]);
    const tableMarkup = sectionMatch[3];
    const rows = tableMarkup.match(/<tr>([\s\S]*?)<\/tr>/gi) ?? [];

    for (const rowMarkup of rows) {
      const columns = [...rowMarkup.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
        (match) => match[1],
      );

      if (columns.length < 5) {
        continue;
      }

      const name = stripTags(columns[1]);

      if (!name || name === "Name") {
        continue;
      }

      const imageUrl =
        columns[0].match(/src=['"]([^'"]+)['"]/i)?.[1] ??
        columns[0].match(/data-src=['"]([^'"]+)['"]/i)?.[1] ??
        "";
      const tagDetailUrl = columns[3].match(/href=['"]([^'"]+)['"]/i)?.[1] ?? null;
      const tag = stripTags(columns[3]) || null;
      const locationEntries = parseSerebiiLocationEntries(columns[4], pageUrl);

      items.push({
        slug: slugify(name),
        anchor,
        category,
        name,
        description: stripTags(columns[2]),
        tag,
        tag_detail_url: tagDetailUrl ? toAbsoluteUrl(tagDetailUrl, pageUrl) : null,
        image_url: imageUrl ? toAbsoluteUrl(imageUrl, pageUrl) : "",
        location_summary: locationEntries.map((entry) => entry.raw_text).join(" | "),
        location_entries: locationEntries,
        source_url: pageUrl,
        scraped_at: scrapedAt,
      });
    }
  }

  return {
    source_url: pageUrl,
    scraped_at: scrapedAt,
    total_items: items.length,
    categories: sortCategoryCounts(items),
    items,
  };
}

function inferLinkedHabitats(item: ScrapedItemRecord, habitats: HabitatRecord[]) {
  const searchSegments = [
    item.name,
    item.summary,
    item.obtain_method,
    item.location,
    item.notes,
    ...item.how_to_get_sections.flatMap((section) => [section.title, ...section.paragraphs]),
    ...item.how_to_use_sections.flatMap((section) => [section.title, ...section.paragraphs]),
  ];
  const searchText = normalizeForMatch(searchSegments.join(" | "));
  const matchedHabitats = new Map<string, LinkedHabitatRecord>();

  habitats.forEach((habitat) => {
    const reasons: string[] = [];
    const habitatNeedle = normalizeForMatch(habitat.name);

    if (habitatNeedle && habitatNeedle.length > 3 && searchText.includes(habitatNeedle)) {
      reasons.push(`Mentioned habitat ${habitat.name}.`);
    }

    const pokemonMatches = habitat.pokemon_available.filter((pokemonName) => {
      const pokemonNeedle = normalizeForMatch(pokemonName);
      return pokemonNeedle.length > 2 && searchText.includes(pokemonNeedle);
    });

    if (pokemonMatches.length > 0) {
      reasons.push(
        `Mentions ${pokemonMatches.slice(0, 3).join(", ")}, which can appear here.`,
      );
    }

    if (reasons.length === 0) {
      return;
    }

    matchedHabitats.set(habitat.slug, {
      ...habitat,
      match_reason: reasons.join(" "),
    });
  });

  return [...matchedHabitats.values()].sort((left, right) => {
    if (left.dex_number && right.dex_number) {
      return left.dex_number.localeCompare(right.dex_number, undefined, {
        numeric: true,
      });
    }

    return left.name.localeCompare(right.name);
  });
}

function buildMaterialsSnapshot(
  items: ScrapedItemRecord[],
  habitats: HabitatRecord[],
  serebiiItemsBySlug: Map<string, SerebiiItemRecord>,
) {
  return items
    .filter((item) => item.category === "Materials")
    .map((item): MaterialSnapshotRecord => {
      const serebiiItem = serebiiItemsBySlug.get(item.slug) ?? null;
      const linkedHabitats = inferLinkedHabitats(item, habitats);
      const serebiiLocationSummary = serebiiItem?.location_summary ?? null;

      return {
        slug: item.slug,
        name: item.name,
        category: item.category,
        obtain_method: item.obtain_method,
        crafting_recipe: item.crafting_recipe,
        location: serebiiLocationSummary || item.location,
        notes: truncate(
          [
            item.notes,
            serebiiLocationSummary ? `Serebii locations: ${serebiiLocationSummary}` : "",
          ]
            .filter(Boolean)
            .join(" "),
          500,
        ),
        detail_url: item.detail_url,
        image_url: item.image_url,
        summary: item.summary,
        how_to_get_sections: item.how_to_get_sections,
        how_to_use_sections: item.how_to_use_sections,
        linked_habitats: linkedHabitats,
        serebii_category: serebiiItem?.category ?? null,
        serebii_description: serebiiItem?.description ?? null,
        serebii_location_summary: serebiiLocationSummary,
        serebii_locations: serebiiItem?.location_entries ?? [],
        serebii_image_url: serebiiItem?.image_url ?? null,
      };
    });
}

function buildUnifiedItemCatalog(
  game8Items: ScrapedItemRecord[],
  serebiiSnapshot: SerebiiItemSnapshot,
  habitats: HabitatRecord[],
) {
  const game8BySlug = new Map(game8Items.map((item) => [item.slug, item] as const));
  const items: UnifiedItemCatalogRecord[] = [];
  const matchedGame8Slugs = new Set<string>();

  serebiiSnapshot.items.forEach((serebiiItem) => {
    const game8Item = game8BySlug.get(serebiiItem.slug) ?? null;

    if (game8Item) {
      matchedGame8Slugs.add(game8Item.slug);
    }

    items.push({
      slug: serebiiItem.slug,
      name: serebiiItem.name,
      primary_category: serebiiItem.category,
      serebii_category: serebiiItem.category,
      game8_category: game8Item?.category ?? null,
      description: serebiiItem.description || game8Item?.summary || "",
      tag: serebiiItem.tag,
      tag_detail_url: serebiiItem.tag_detail_url,
      primary_image_url: serebiiItem.image_url || game8Item?.image_url || null,
      serebii_image_url: serebiiItem.image_url || null,
      game8_image_url: game8Item?.image_url ?? null,
      location_summary: serebiiItem.location_summary || game8Item?.location || "",
      location_entries: serebiiItem.location_entries,
      obtain_method: game8Item?.obtain_method ?? null,
      crafting_recipe: game8Item?.crafting_recipe ?? null,
      habitats: game8Item ? inferLinkedHabitats(game8Item, habitats) : [],
      source_urls: {
        serebii: serebiiItemsSourceUrl,
        game8: game8Item?.detail_url ?? null,
      },
    });
  });

  game8Items.forEach((game8Item) => {
    if (matchedGame8Slugs.has(game8Item.slug)) {
      return;
    }

    items.push({
      slug: game8Item.slug,
      name: game8Item.name,
      primary_category: game8Item.category,
      serebii_category: null,
      game8_category: game8Item.category,
      description: game8Item.summary,
      tag: null,
      tag_detail_url: null,
      primary_image_url: game8Item.image_url || null,
      serebii_image_url: null,
      game8_image_url: game8Item.image_url || null,
      location_summary: game8Item.location,
      location_entries: [],
      obtain_method: game8Item.obtain_method,
      crafting_recipe: game8Item.crafting_recipe,
      habitats: inferLinkedHabitats(game8Item, habitats),
      source_urls: {
        serebii: null,
        game8: game8Item.detail_url,
      },
    });
  });

  items.sort((left, right) => {
    const categoryComparison = left.primary_category.localeCompare(right.primary_category);

    if (categoryComparison !== 0) {
      return categoryComparison;
    }

    return left.name.localeCompare(right.name);
  });

  return {
    generated_at: new Date().toISOString(),
    sources: {
      game8_items: game8ItemsSourceUrl,
      game8_habitats: game8HabitatSourceUrl,
      serebii_items: serebiiItemsSourceUrl,
    },
    total_items: items.length,
    total_items_with_images: items.filter((item) => item.primary_image_url).length,
    total_items_with_location_entries: items.filter((item) => item.location_entries.length > 0)
      .length,
    categories: sortCategoryCounts(
      items.map((item) => ({
        category: item.primary_category,
      })),
    ),
    items,
  } satisfies UnifiedItemCatalogSnapshot;
}

async function main() {
  const [game8ItemsHtml, game8HabitatHtml, serebiiItemsHtml] = await Promise.all([
    fetchHtml(game8ItemsSourceUrl),
    fetchHtml(game8HabitatSourceUrl),
    fetchHtml(serebiiItemsSourceUrl),
  ]);
  const game8ItemIndexMarkup = extractGame8ItemIndexMarkup(game8ItemsHtml);
  const game8HabitatIndexMarkup = extractHabitatIndexMarkup(game8HabitatHtml);
  const listedGame8Items = parseGame8ItemIndex(game8ItemIndexMarkup, game8ItemsSourceUrl);
  const habitats = parseHabitats(game8HabitatIndexMarkup, game8HabitatSourceUrl);
  const game8Items = await mapWithConcurrency(
    listedGame8Items,
    maxConcurrency,
    scrapeGame8Detail,
  );
  const serebiiSnapshot = parseSerebiiItems(serebiiItemsHtml, serebiiItemsSourceUrl);
  const serebiiItemsBySlug = new Map(
    serebiiSnapshot.items.map((item) => [item.slug, item] as const),
  );
  const materialsSnapshot = buildMaterialsSnapshot(game8Items, habitats, serebiiItemsBySlug);
  const unifiedCatalog = buildUnifiedItemCatalog(game8Items, serebiiSnapshot, habitats);
  const failedGame8Items = game8Items.filter((item) => item.scrape_error).length;
  const linkedMaterials = materialsSnapshot.filter((item) => item.linked_habitats.length > 0)
    .length;

  await mkdir(outputDir, { recursive: true });
  await writeFile(allGame8ItemsOutputPath, JSON.stringify(game8Items, null, 2), "utf8");
  await writeFile(materialsOutputPath, JSON.stringify(materialsSnapshot, null, 2), "utf8");
  await writeFile(habitatsOutputPath, JSON.stringify(habitats, null, 2), "utf8");
  await writeFile(serebiiItemsOutputPath, JSON.stringify(serebiiSnapshot, null, 2), "utf8");
  await writeFile(unifiedCatalogOutputPath, JSON.stringify(unifiedCatalog, null, 2), "utf8");

  console.log(
    [
      `Scraped ${game8Items.length} Game8 items from ${game8ItemsSourceUrl}.`,
      `Wrote Game8 item details to ${allGame8ItemsOutputPath}.`,
      `Wrote ${materialsSnapshot.length} material records to ${materialsOutputPath}.`,
      `Wrote ${habitats.length} habitat records to ${habitatsOutputPath}.`,
      `Wrote ${serebiiSnapshot.total_items} Serebii item records to ${serebiiItemsOutputPath}.`,
      `Wrote unified item catalog with ${unifiedCatalog.total_items} items to ${unifiedCatalogOutputPath}.`,
      `Catalog images available for ${unifiedCatalog.total_items_with_images} items.`,
      `Catalog location entries available for ${unifiedCatalog.total_items_with_location_entries} items.`,
      `Linked ${linkedMaterials} materials to one or more habitats from ${game8HabitatSourceUrl}.`,
      failedGame8Items > 0
        ? `${failedGame8Items} Game8 item detail pages failed and were kept with scrape_error metadata.`
        : "All Game8 item detail pages were scraped successfully.",
    ].join(" "),
  );
}

main().catch((error) => {
  console.error("Unable to scrape Pokopia item sources.", error);
  process.exitCode = 1;
});
