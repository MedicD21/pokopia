import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { MetricPill } from "@/components/ui/metric-pill";
import { sampleBuildings } from "@/data/buildings";
import { blockMaterials } from "@/data/materials";
import { pokemonHelpers } from "@/data/pokemon-helpers";
import { navigationItems } from "@/lib/navigation";

export default function HomePage() {
  const totalBlocks = sampleBuildings.reduce(
    (sum, building) => sum + building.blocks.length,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <SectionCard
          eyebrow="Creative Planner"
          title="Build an entire Pokopia town from street grid to roof tile."
          description="This foundation app already connects a grid-based map planner, a voxel builder, materials calculations, API routes, starter data, and a mocked screenshot-import flow."
          action={
            <div className="flex flex-wrap gap-3">
              <Link
                href="/builder"
                className="rounded-2xl bg-[color:var(--foreground)] px-5 py-3 text-sm font-semibold text-[color:var(--background)]"
              >
                Open builder
              </Link>
              <Link
                href="/map"
                className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-semibold text-[color:var(--foreground)]"
              >
                Open map
              </Link>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-4">
            <MetricPill label="Starter blueprints" value={sampleBuildings.length} />
            <MetricPill label="Sample blocks" value={totalBlocks} accent="teal" />
            <MetricPill label="Materials" value={blockMaterials.length} accent="blue" />
            <MetricPill label="Helpers" value={pokemonHelpers.length} accent="orange" />
          </div>
        </SectionCard>
        <SectionCard
          eyebrow="Current Scope"
          title="Phase One Vertical Slice"
          description="The app is live enough to explore core workflows before we swap the bootstrap storage layer for full Prisma-backed persistence."
        >
          <div className="space-y-3 text-sm leading-6 text-[color:var(--muted)]">
            <p>Interactive 2D town planner with roads, decorations, placements, rotate, move, and save.</p>
            <p>Interactive 3D builder with instanced voxel rendering, painting, layer editing, and export-ready JSON.</p>
            <p>Materials and helper recommendations wired into reusable utilities and API routes.</p>
            <p>Screenshot upload route that returns an editable approximation for the builder pipeline.</p>
          </div>
        </SectionCard>
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        {navigationItems
          .filter((item) => item.href !== "/home")
          .map((item) => (
            <SectionCard
              key={item.href}
              title={item.label}
              description={item.summary}
              action={
                <Link
                  href={item.href}
                  className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
                >
                  Open
                </Link>
              }
            >
              <p className="text-sm leading-6 text-[color:var(--muted)]">
                {item.href === "/map"
                  ? "Shape the district plan with a 100 x 100 sparse tile grid and draggable building footprints."
                  : item.href === "/builder"
                    ? "Edit sample blueprints or imported scans in the voxel builder and generate JSON instantly."
                    : item.href === "/materials"
                      ? "Inspect counts, sourcing notes, and recommended build helpers in one place."
                      : item.href === "/library"
                        ? "Browse reusable starter structures and see which materials dominate each design."
                        : "Turn a screenshot into a rough shell that can be refined in the builder."}
              </p>
            </SectionCard>
          ))}
      </section>
    </div>
  );
}
