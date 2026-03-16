"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AutoBuildAssistant } from "@/components/builder3d/auto-build-assistant";
import { MaterialsBreakdown } from "@/components/materials/materials-breakdown";
import { HelperPanel } from "@/components/pokemon/helper-panel";
import { SectionCard } from "@/components/ui/section-card";
import { summarizeMaterials } from "@/lib/materials";
import type { AutoBuildOptions, BuildingData } from "@/lib/types";
import { useBuilderStore } from "@/store/use-builder-store";

export function AiBuilderWorkbench() {
  const router = useRouter();
  const loadBlueprint = useBuilderStore((state) => state.loadBlueprint);
  const [generatedBlueprint, setGeneratedBlueprint] = useState<BuildingData | null>(null);
  const [generatedOptions, setGeneratedOptions] = useState<AutoBuildOptions | null>(null);
  const summary = useMemo(
    () => (generatedBlueprint ? summarizeMaterials(generatedBlueprint) : null),
    [generatedBlueprint],
  );

  function handleGenerate(blueprint: BuildingData, options: AutoBuildOptions) {
    setGeneratedBlueprint(blueprint);
    setGeneratedOptions(options);
  }

  function handleOpenInBuilder() {
    if (!generatedBlueprint) {
      return;
    }

    loadBlueprint(generatedBlueprint);
    router.push("/builder");
  }

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="AI Builder"
        title="Generate a starter structure before you fine-tune it in 3D."
        description="Use the assistant to choose shell style, materials, dimensions, and feature pieces. When the draft looks right, send it straight into the voxel builder."
        action={
          <Link
            href="/builder"
            className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
          >
            Open 3D builder
          </Link>
        }
      >
        <AutoBuildAssistant onGenerate={handleGenerate} />
      </SectionCard>

      <SectionCard
        eyebrow="Draft Preview"
        title={generatedBlueprint ? generatedBlueprint.name : "No generated draft yet"}
        description={
          generatedBlueprint
            ? generatedBlueprint.description
            : "Generate a build to review its footprint, materials, and suggested helper Pokemon before opening it in the builder."
        }
        action={
          <button
            type="button"
            onClick={handleOpenInBuilder}
            disabled={!generatedBlueprint}
            className="rounded-2xl border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open in 3D Builder
          </button>
        }
      >
        {generatedBlueprint && summary ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Blocks
                </p>
                <p className="mt-1 font-display text-3xl text-[color:var(--foreground)]">
                  {summary.totalBlocks}
                </p>
              </div>
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Footprint
                </p>
                <p className="mt-1 font-display text-3xl text-[color:var(--foreground)]">
                  {summary.footprint.width}x{summary.footprint.depth}
                </p>
              </div>
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Height
                </p>
                <p className="mt-1 font-display text-3xl text-[color:var(--foreground)]">
                  {summary.footprint.height}
                </p>
              </div>
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Style
                </p>
                <p className="mt-1 font-display text-2xl text-[color:var(--foreground)]">
                  {generatedOptions?.style ?? "custom"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              {generatedBlueprint.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[color:var(--surface)] px-3 py-2"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
              <MaterialsBreakdown
                title="Generated Materials"
                description="These counts come directly from the auto-built draft that will be loaded into the voxel builder."
                materials={summary.materials}
                totalBlocks={summary.totalBlocks}
              />
              <HelperPanel
                helpers={summary.helpers}
                title="Recommended Build Helpers"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4 text-sm leading-6 text-[color:var(--muted)]">
            The draft preview will appear here after you generate a build.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
