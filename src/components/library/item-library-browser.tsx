"use client";

import Image from "next/image";
import { useState } from "react";

import { SectionCard } from "@/components/ui/section-card";
import type { ItemCatalogEntry, ItemCatalogSnapshot } from "@/lib/types";

const catalogDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function truncateText(input: string, maxLength = 180) {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, maxLength - 1).trimEnd()}...`;
}

function ItemCard({ item }: { item: ItemCatalogEntry }) {
  const detailText =
    item.description ||
    item.obtainMethod ||
    item.craftingRecipe ||
    "Catalog entry imported from the shared Pokopia item index.";
  const locationText = item.locationSummary || "Location details are still being organized.";

  return (
    <article className="rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)]/90 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
      <div className="flex items-start gap-4">
        {item.primaryImageUrl ? (
          <Image
            src={item.primaryImageUrl}
            alt={item.name}
            width={72}
            height={72}
            sizes="72px"
            className="h-[72px] w-[72px] rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] object-contain p-2"
          />
        ) : (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Item
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl text-[color:var(--foreground)]">
              {item.name}
            </h3>
            <span className="rounded-full bg-[color:var(--accent)]/14 px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground)]">
              {item.primaryCategory}
            </span>
            {item.tag ? (
              <span className="rounded-full bg-[color:var(--accent-2)]/14 px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground)]">
                {item.tag}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {truncateText(detailText)}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--accent-2)]">
          Location
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          {truncateText(locationText, 220)}
        </p>
      </div>
      {item.sourceUrls.serebii && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={item.sourceUrls.serebii}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]/60 hover:bg-[color:var(--accent)]/10"
          >
            Serebii
          </a>
        </div>
      )}
    </article>
  );
}

export function ItemLibraryBrowser({ catalog }: { catalog: ItemCatalogSnapshot }) {
  const [activeCategory, setActiveCategory] = useState(
    () => catalog.categories.find((category) => category.name === "Materials")?.name ??
      catalog.categories[0]?.name ??
      "",
  );
  const filteredItems = activeCategory
    ? catalog.items.filter((item) => item.primaryCategory === activeCategory)
    : catalog.items;
  const activeCount =
    catalog.categories.find((category) => category.name === activeCategory)?.count ??
    filteredItems.length;

  if (catalog.items.length === 0) {
    return (
      <SectionCard
        eyebrow="Catalog"
        title="Item Library"
        description="Run the scraper to populate the Serebii item index for this page."
      >
        <p className="rounded-2xl bg-[color:var(--surface)] px-4 py-4 text-sm leading-6 text-[color:var(--muted)]">
          No item catalog data is available yet.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      eyebrow="Catalog"
      title="Item Library"
      description="Browse the shared Pokopia item catalog by type. Images, names, and locations are pulled from the same scraped source data used for checklist matching."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Total items
          </p>
          <p className="mt-1 font-display text-3xl text-[color:var(--foreground)]">
            {catalog.totalItems}
          </p>
        </div>
        <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Categories
          </p>
          <p className="mt-1 font-display text-3xl text-[color:var(--foreground)]">
            {catalog.categories.length}
          </p>
        </div>
        <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
            With images
          </p>
          <p className="mt-1 font-display text-3xl text-[color:var(--foreground)]">
            {catalog.totalItemsWithImages}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {catalog.categories.map((category) => {
          const isActive = category.name === activeCategory;

          return (
            <button
              key={category.name}
              type="button"
              onClick={() => setActiveCategory(category.name)}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "border-[color:var(--accent)]/60 bg-[color:var(--accent)]/16 text-[color:var(--foreground)]"
                  : "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--accent)]/8"
              }`}
            >
              {category.name}
              <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-xs font-semibold text-[color:var(--muted)]">
                {category.count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">
          Showing {activeCount} {activeCategory ? activeCategory.toLowerCase() : "catalog"} items
        </p>
        {catalog.generatedAt ? (
          <p className="text-sm text-[color:var(--muted)]">
            Updated {catalogDateFormatter.format(new Date(catalog.generatedAt))}
          </p>
        ) : null}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredItems.map((item) => (
          <ItemCard key={`${item.primaryCategory}:${item.slug}`} item={item} />
        ))}
      </div>
    </SectionCard>
  );
}
