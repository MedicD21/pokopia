"use client";

import Image from "next/image";
import { useDeferredValue, useState } from "react";

import { SectionCard } from "@/components/ui/section-card";
import type { ItemCatalogEntry, ItemCatalogSnapshot } from "@/lib/types";

function CollapsibleSection({
  children,
  defaultOpen = false,
  label,
  subtitle,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  label: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[color:var(--foreground)]">{label}</span>
          {subtitle ? (
            <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {subtitle}
            </span>
          ) : null}
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? <div className="border-t border-[color:var(--line)] px-4 py-3">{children}</div> : null}
    </div>
  );
}

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

function normalizeForSearch(input: string) {
  return input.toLowerCase().replaceAll("pokémon", "pokemon").replaceAll("poké", "poke");
}

function matchesSearch(item: ItemCatalogEntry, query: string) {
  if (!query) {
    return true;
  }

  const searchText = normalizeForSearch(
    [
      item.name,
      item.primaryCategory,
      item.serebiiCategory ?? "",
      item.description,
      item.locationSummary,
      item.obtainMethod ?? "",
      item.craftingRecipe ?? "",
      item.tag ?? "",
      item.collectionLabel ?? "",
      item.typeLabel ?? "",
      ...item.labels,
    ].join(" "),
  );

  return searchText.includes(query);
}

function buildFacetCounts(values: string[]) {
  return [...values.reduce((lookup, value) => {
    lookup.set(value, (lookup.get(value) ?? 0) + 1);
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

function limitFacetOptions(
  options: Array<{ name: string; count: number }>,
  limit: number,
  activeValue: string,
) {
  if (!activeValue) {
    return options.slice(0, limit);
  }

  const topOptions = options.slice(0, limit);

  if (topOptions.some((option) => option.name === activeValue)) {
    return topOptions;
  }

  const activeOption = options.find((option) => option.name === activeValue);

  return activeOption ? [activeOption, ...topOptions.slice(0, Math.max(0, limit - 1))] : topOptions;
}

function FilterChip({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-[color:var(--accent)]/60 bg-[color:var(--accent)]/16 text-[color:var(--foreground)]"
          : "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--accent)]/8"
      }`}
    >
      {label}
      {count !== undefined ? (
        <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-xs font-semibold text-[color:var(--muted)]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function ItemCard({ item }: { item: ItemCatalogEntry }) {
  const detailText =
    item.description ||
    item.obtainMethod ||
    item.craftingRecipe ||
    "Catalog entry imported from the shared Pokopia item index.";
  const locationText = item.locationSummary || "Location details are still being organized.";
  const visibleLabels = item.labels
    .filter(
      (label) =>
        label !== item.collectionLabel && label !== item.typeLabel && label !== item.tag,
    )
    .slice(0, 5);

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
            {item.collectionLabel ? (
              <span className="rounded-full bg-[color:var(--accent-2)]/14 px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground)]">
                {item.collectionLabel}
              </span>
            ) : null}
            {item.typeLabel ? (
              <span className="rounded-full bg-[color:var(--surface-strong)] px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground)]">
                {item.typeLabel}
              </span>
            ) : null}
            {item.tag ? (
              <span className="rounded-full bg-[color:var(--surface-strong)] px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground)]">
                {item.tag}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            {truncateText(detailText)}
          </p>
        </div>
      </div>
      {visibleLabels.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {visibleLabels.map((label) => (
            <span
              key={`${item.slug}:${label}`}
              className="rounded-full bg-[color:var(--surface-strong)] px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground)]"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
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
    () =>
      catalog.categories.find((category) => category.name === "Materials")?.name ??
      catalog.categories[0]?.name ??
      "",
  );
  const [searchText, setSearchText] = useState("");
  const [activeCollection, setActiveCollection] = useState("");
  const [activeLabel, setActiveLabel] = useState("");
  const deferredSearchText = useDeferredValue(searchText);
  const searchQuery = normalizeForSearch(deferredSearchText.trim());
  const categoryItems = activeCategory
    ? catalog.items.filter((item) => item.primaryCategory === activeCategory)
    : catalog.items;
  const searchItems = categoryItems.filter((item) => matchesSearch(item, searchQuery));
  const collectionOptions = buildFacetCounts(
    searchItems.flatMap((item) => (item.collectionLabel ? [item.collectionLabel] : [])),
  );
  const labelOptions = buildFacetCounts(
    searchItems.flatMap((item) =>
      [...new Set(item.labels.filter((label) => label !== item.collectionLabel))],
    ),
  );
  const resolvedActiveCollection =
    activeCollection && collectionOptions.some((option) => option.name === activeCollection)
      ? activeCollection
      : "";
  const resolvedActiveLabel =
    activeLabel && labelOptions.some((option) => option.name === activeLabel)
      ? activeLabel
      : "";
  const visibleCollectionOptions = limitFacetOptions(
    collectionOptions,
    18,
    resolvedActiveCollection,
  );
  const visibleLabelOptions = limitFacetOptions(labelOptions, 24, resolvedActiveLabel);
  const filteredItems = searchItems.filter((item) => {
    if (resolvedActiveCollection && item.collectionLabel !== resolvedActiveCollection) {
      return false;
    }

    if (resolvedActiveLabel && !item.labels.includes(resolvedActiveLabel)) {
      return false;
    }

    return true;
  });
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
      description="Browse the shared Pokopia item catalog with category filters, search, collection labels, and derived tags. Similar items now group into sets like furniture families, roof lines, kit families, and other repeated themes."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            Collection groups
          </p>
          <p className="mt-1 font-display text-3xl text-[color:var(--foreground)]">
            {buildFacetCounts(
              catalog.items.flatMap((item) => (item.collectionLabel ? [item.collectionLabel] : [])),
            ).length}
          </p>
        </div>
        <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Distinct labels
          </p>
          <p className="mt-1 font-display text-3xl text-[color:var(--foreground)]">
            {buildFacetCounts(
              catalog.items.flatMap((item) => [...new Set(item.labels)]),
            ).length}
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <CollapsibleSection label="Categories" subtitle={`${catalog.categories.length} total`} defaultOpen>
          <div className="flex flex-wrap gap-2">
            {catalog.categories.map((category) => {
              const isActive = category.name === activeCategory;

              return (
                <FilterChip
                  key={category.name}
                  active={isActive}
                  count={category.count}
                  label={category.name}
                  onClick={() => {
                    setActiveCategory(category.name);
                    setActiveCollection("");
                    setActiveLabel("");
                  }}
                />
              );
            })}
          </div>
        </CollapsibleSection>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[color:var(--muted)]">Search catalog</span>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search names, tags, sets, materials, or locations"
            className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => {
              setSearchText("");
              setActiveCollection("");
              setActiveLabel("");
            }}
            className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--accent)]/8"
          >
            Reset filters
          </button>
        </div>
      </div>
      {collectionOptions.length > 0 ? (
        <div className="mt-4">
          <CollapsibleSection label="Sets" subtitle="Family groups and named sets">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={!activeCollection}
                label="All sets"
                onClick={() => setActiveCollection("")}
              />
              {visibleCollectionOptions.map((option) => (
                <FilterChip
                  key={option.name}
                  active={resolvedActiveCollection === option.name}
                  count={option.count}
                  label={option.name}
                  onClick={() =>
                    setActiveCollection((current) => (current === option.name ? "" : option.name))
                  }
                />
              ))}
            </div>
          </CollapsibleSection>
        </div>
      ) : null}
      {labelOptions.length > 0 ? (
        <div className="mt-4">
          <CollapsibleSection label="Labels" subtitle="Item roles, materials, and styles">
            <div className="flex flex-wrap gap-2">
              <FilterChip active={!activeLabel} label="All labels" onClick={() => setActiveLabel("")} />
              {visibleLabelOptions.map((option) => (
                <FilterChip
                  key={option.name}
                  active={resolvedActiveLabel === option.name}
                  count={option.count}
                  label={option.name}
                  onClick={() => setActiveLabel((current) => (current === option.name ? "" : option.name))}
                />
              ))}
            </div>
          </CollapsibleSection>
        </div>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">
          Showing {filteredItems.length} of {activeCount}{" "}
          {activeCategory ? activeCategory.toLowerCase() : "catalog"} items
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--muted)]">
          {resolvedActiveCollection ? <span>Collection: {resolvedActiveCollection}</span> : null}
          {resolvedActiveLabel ? <span>Label: {resolvedActiveLabel}</span> : null}
          {catalog.generatedAt ? (
            <span>Updated {catalogDateFormatter.format(new Date(catalog.generatedAt))}</span>
          ) : null}
        </div>
      </div>
      {filteredItems.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-[color:var(--surface)] px-4 py-4 text-sm leading-6 text-[color:var(--muted)]">
          No items match the current search and tag filters. Try clearing one of the active filters.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredItems.map((item) => (
            <ItemCard key={`${item.primaryCategory}:${item.slug}`} item={item} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
