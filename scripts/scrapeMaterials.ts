import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceUrl =
  process.argv[2] ?? "https://game8.co/games/Pokemon-Pokopia/archives/584741";
const outputDir = path.join(process.cwd(), "storage");
const allItemsOutputPath = path.join(outputDir, "game8-items-scraped.json");
const materialsOutputPath = path.join(outputDir, "materials-scraped.json");
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

interface ScrapedItemRecord extends ListItemRecord {
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

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
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

function truncate(input: string, maxLength = 320) {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, maxLength - 1).trimEnd()}...`;
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

function extractItemIndexMarkup(html: string) {
  const start = html.indexOf("<h2 class='a-header--2' id='hl_1'>List of All Items</h2>");

  if (start < 0) {
    throw new Error("Unable to find the item index heading on the source page.");
  }

  const end = html.indexOf("Pokemon Pokopia Guides by Category", start);

  if (end < 0) {
    throw new Error("Unable to find the end of the item index on the source page.");
  }

  return html.slice(start, end);
}

function parseAllItems(indexMarkup: string, pageUrl: string) {
  const sectionRegex =
    /<h3 class='a-header--3' id='[^']+'>(.*?)<\/h3>([\s\S]*?)(?=<h3 class='a-header--3' id='[^']+'|$)/g;
  const itemRegex =
    /<a class='a-link' href=(https:\/\/game8\.co\/games\/Pokemon-Pokopia\/archives\/\d+)><img[\s\S]*?alt='([^']+)'[\s\S]*?data-src='([^']+)'[\s\S]*?\/>\s*([^<]+)<\/a>/g;

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

function extractH2Section(html: string, headingPrefix: string) {
  const regex = new RegExp(
    `<h2 class='a-header--2' id='[^']+'>${headingPrefix}[^<]*<\\/h2>([\\s\\S]*?)(?=<h2 class='a-header--2' id='[^']+'>|$)`,
    "i",
  );

  return html.match(regex)?.[1] ?? "";
}

function parseGuideSections(sectionMarkup: string) {
  const subsectionRegex =
    /<h3 class='a-header--3' id='[^']+'>(.*?)<\/h3>([\s\S]*?)(?=<h3 class='a-header--3' id='[^']+'|$)/g;
  const paragraphRegex = /<p class='a-paragraph'>([\s\S]*?)<\/p>/g;
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

  return truncate(
    howToGetSections
      .map((section) =>
        section.paragraphs[0] ? `${section.title}: ${section.paragraphs[0]}` : section.title,
      )
      .join(" | "),
  );
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

async function scrapeDetail(item: ListItemRecord): Promise<ScrapedItemRecord> {
  try {
    const html = await fetchHtml(item.detail_url);
    const summary = extractMetaDescription(html);
    const howToGetSections = parseGuideSections(extractH2Section(html, "How to Get"));
    const howToUseSections = parseGuideSections(extractH2Section(html, "How to Use"));
    const obtainMethod =
      flattenSections(howToGetSections) || "No obtain method was listed on the source page.";
    const craftingRecipe = deriveCraftingRecipe(item.category, howToUseSections);
    const location = deriveLocation(howToGetSections);

    return {
      ...item,
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

function buildMaterialsSnapshot(items: ScrapedItemRecord[]) {
  return items
    .filter((item) => item.category === "Materials")
    .map((item) => ({
      name: item.name,
      category: item.category,
      obtain_method: item.obtain_method,
      crafting_recipe: item.crafting_recipe,
      location: item.location,
      notes: item.notes,
      detail_url: item.detail_url,
      image_url: item.image_url,
      summary: item.summary,
      how_to_get_sections: item.how_to_get_sections,
      how_to_use_sections: item.how_to_use_sections,
    }));
}

async function main() {
  const indexHtml = await fetchHtml(sourceUrl);
  const indexMarkup = extractItemIndexMarkup(indexHtml);
  const listItems = parseAllItems(indexMarkup, sourceUrl);
  const scrapedItems = await mapWithConcurrency(listItems, maxConcurrency, scrapeDetail);
  const materialsSnapshot = buildMaterialsSnapshot(scrapedItems);

  await mkdir(outputDir, { recursive: true });
  await writeFile(allItemsOutputPath, JSON.stringify(scrapedItems, null, 2), "utf8");
  await writeFile(
    materialsOutputPath,
    JSON.stringify(materialsSnapshot, null, 2),
    "utf8",
  );

  const failedItems = scrapedItems.filter((item) => item.scrape_error).length;

  console.log(
    [
      `Scraped ${scrapedItems.length} items from ${sourceUrl}.`,
      `Wrote all items to ${allItemsOutputPath}.`,
      `Wrote ${materialsSnapshot.length} material records to ${materialsOutputPath}.`,
      failedItems > 0 ? `${failedItems} item detail pages failed and were kept with scrape_error metadata.` : "All item detail pages were scraped successfully.",
    ].join(" "),
  );
}

main().catch((error) => {
  console.error("Unable to scrape Game8 items.", error);
  process.exitCode = 1;
});
