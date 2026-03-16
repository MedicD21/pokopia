"use client";

import { useState } from "react";

import { HelperPanel } from "@/components/pokemon/helper-panel";
import { MaterialsBreakdown } from "@/components/materials/materials-breakdown";
import { SectionCard } from "@/components/ui/section-card";
import { sampleBuildings } from "@/data/buildings";
import { deriveFootprintFromBlocks, summarizeMaterials } from "@/lib/materials";
import type { BuildingData } from "@/lib/types";
import { useBuilderStore } from "@/store/use-builder-store";

export function MaterialsWorkbench() {
  const [selectedId, setSelectedId] = useState<string>(
    sampleBuildings[0]?.id ?? "builder-live",
  );
  const [source, setSource] = useState<"sample" | "builder">(
    sampleBuildings.length > 0 ? "sample" : "builder",
  );
  const builderName = useBuilderStore((state) => state.name);
  const builderDescription = useBuilderStore((state) => state.description);
  const builderTheme = useBuilderStore((state) => state.theme);
  const builderBlocks = useBuilderStore((state) => state.blocks);

  const liveBuilderBuilding: BuildingData = {
    id: "builder-live",
    name: builderName,
    description: builderDescription,
    theme: builderTheme,
    footprint: deriveFootprintFromBlocks(builderBlocks),
    blocks: builderBlocks,
    tags: ["builder-live"],
    suggestedSkills: [],
  };

  const selectedSample =
    sampleBuildings.find((building) => building.id === selectedId) ??
    (sampleBuildings[0] as BuildingData | undefined) ??
    liveBuilderBuilding;
  const activeBuilding =
    source === "builder" && builderBlocks.length > 0
      ? liveBuilderBuilding
      : selectedSample;
  const summary = summarizeMaterials(activeBuilding);

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
      <SectionCard
        eyebrow="Workbench"
        title="Material Source"
        description="Compare starter templates or inspect the scene currently loaded in the builder."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSource("sample")}
              className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                source === "sample"
                  ? "border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 text-[color:var(--foreground)]"
                  : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
              }`}
            >
              Starter blueprint
            </button>
            <button
              type="button"
              onClick={() => setSource("builder")}
              className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                source === "builder" && builderBlocks.length > 0
                  ? "border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 text-[color:var(--foreground)]"
                  : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
              }`}
              disabled={builderBlocks.length === 0}
            >
              Live builder scene
            </button>
          </div>
          {source === "sample" ? (
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[color:var(--muted)]">
                Blueprint
              </span>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
              >
                {sampleBuildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="rounded-2xl bg-[color:var(--surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-2)]">
              Active Build
            </p>
            <p className="mt-2 font-display text-2xl text-[color:var(--foreground)]">
              {activeBuilding.name}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              {activeBuilding.description}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-[color:var(--accent)]/12 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Width
                </p>
                <p className="mt-1 font-display text-xl">
                  {summary.footprint.width}
                </p>
              </div>
              <div className="rounded-2xl bg-[color:var(--accent-2)]/12 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Depth
                </p>
                <p className="mt-1 font-display text-xl">
                  {summary.footprint.depth}
                </p>
              </div>
              <div className="rounded-2xl bg-[#7da6ff]/12 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Height
                </p>
                <p className="mt-1 font-display text-xl">
                  {summary.footprint.height}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
      <MaterialsBreakdown
        materials={summary.materials}
        totalBlocks={summary.totalBlocks}
        title="Build Checklist"
      />
      <HelperPanel helpers={summary.helpers} />
    </div>
  );
}
