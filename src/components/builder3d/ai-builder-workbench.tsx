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
  const [generatedBlueprint, setGeneratedBlueprint] =
    useState<BuildingData | null>(null);
  const [generatedOptions, setGeneratedOptions] =
    useState<AutoBuildOptions | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const summary = useMemo(
    () => (generatedBlueprint ? summarizeMaterials(generatedBlueprint) : null),
    [generatedBlueprint],
  );

  async function handleGenerate(
    blueprint: BuildingData,
    options: AutoBuildOptions,
  ) {
    setGeneratedBlueprint(blueprint);
    setGeneratedOptions(options);
    setSaveMessage(null);

    // Auto-save the generated blueprint
    await handleAutoSave(blueprint);
  }

  async function handleAutoSave(blueprint: BuildingData) {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/buildings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: blueprint.name ?? "Auto-Generated Build",
          description:
            blueprint.description ??
            "Auto-generated from Auto Builder assistant.",
          data: blueprint,
        }),
      });

      const payload = (await response.json()) as {
        building?: { id: string; name: string };
        error?: string;
      };

      if (!response.ok || payload.error) {
        setSaveMessage(payload.error ?? "Unable to save building right now.");
        return;
      }

      setSaveMessage(
        `✓ Auto-saved as "${payload.building?.name}" — ready to edit in the 3D builder.`,
      );
    } catch {
      setSaveMessage(
        "Auto-save failed — check your connection. You can still open in 3D builder.",
      );
    } finally {
      setIsSaving(false);
    }
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
        eyebrow="Auto Builder"
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
        title={
          generatedBlueprint
            ? generatedBlueprint.name
            : "No generated draft yet"
        }
        description={
          generatedBlueprint
            ? generatedBlueprint.description
            : "Generate a build to review its footprint, materials, and suggested helper Pokemon before opening it in the builder."
        }
        action={
          <div className="flex flex-col gap-2 md:flex-row">
            <button
              type="button"
              onClick={handleOpenInBuilder}
              disabled={!generatedBlueprint}
              className="rounded-2xl border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Open in 3D Builder
            </button>
            <button
              type="button"
              onClick={() =>
                generatedBlueprint && handleAutoSave(generatedBlueprint)
              }
              disabled={!generatedBlueprint || isSaving}
              className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Build"}
            </button>
          </div>
        }
      >
        {generatedBlueprint && summary ? (
          <div className="space-y-6">
            {saveMessage && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  saveMessage.startsWith("✓")
                    ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/8 text-[color:var(--success)]"
                    : "border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/8 text-[color:var(--destructive)]"
                }`}
              >
                {saveMessage}
              </div>
            )}
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
