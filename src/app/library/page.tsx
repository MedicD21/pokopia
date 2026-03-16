import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { sampleBuildings } from "@/data/buildings";
import { summarizeMaterials } from "@/lib/materials";

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="Blueprints"
        title="Starter Building Library"
        description="These reusable templates seed the builder, planner, materials calculator, and recommendation system."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Library items
            </p>
            <p className="mt-1 font-display text-3xl">{sampleBuildings.length}</p>
          </div>
          <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Largest build
            </p>
            <p className="mt-1 font-display text-3xl">
              {Math.max(...sampleBuildings.map((building) => building.blocks.length))}
            </p>
          </div>
          <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Reusable
            </p>
            <p className="mt-1 font-display text-3xl">JSON</p>
          </div>
        </div>
      </SectionCard>
      <div className="grid gap-6 xl:grid-cols-3">
        {sampleBuildings.map((building) => {
          const summary = summarizeMaterials(building);

          return (
            <SectionCard
              key={building.id}
              title={building.name}
              description={building.description}
              action={
                <Link
                  href="/builder"
                  className="rounded-2xl border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
                >
                  Edit in builder
                </Link>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-[color:var(--surface)] px-3 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                      Blocks
                    </p>
                    <p className="mt-1 font-display text-xl">{building.blocks.length}</p>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--surface)] px-3 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                      Size
                    </p>
                    <p className="mt-1 font-display text-xl">
                      {building.footprint.width}x{building.footprint.depth}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[color:var(--surface)] px-3 py-3 text-center">
                    <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                      Theme
                    </p>
                    <p className="mt-1 font-display text-xl capitalize">{building.theme}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {summary.materials.slice(0, 3).map((material) => (
                    <div
                      key={material.materialId}
                      className="flex items-center justify-between rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-sm"
                    >
                      <span>{material.name}</span>
                      <strong>{material.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
