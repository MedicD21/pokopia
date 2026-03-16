import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { navigationItems } from "@/lib/navigation";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(18,31,52,0.95),rgba(8,17,31,0.92))] px-6 py-8 shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,160,39,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(125,166,255,0.12),transparent_36%)]" />
        <div className="relative max-w-4xl space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[color:var(--accent-2)]">
              Pokopia Planner
            </p>
            <h1 className="max-w-4xl font-display text-4xl leading-tight text-[color:var(--foreground)] sm:text-5xl">
              Design towns, draft buildings, and plan materials in one place.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[color:var(--muted)]">
              Jump straight into the map planner, 3D voxel builder, AI draft builder,
              materials lookup, and item library without the extra homepage cards.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/map"
              className="rounded-2xl border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 px-5 py-3 text-sm font-semibold text-[color:var(--foreground)]"
            >
              Open map planner
            </Link>
            <Link
              href="/builder"
              className="rounded-2xl bg-[color:var(--surface-strong)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)]"
            >
              Open 3D builder
            </Link>
            <Link
              href="/ai-builder"
              className="rounded-2xl bg-[color:var(--surface)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)]"
            >
              Open AI builder
            </Link>
          </div>
        </div>
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
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
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
                    : item.href === "/ai-builder"
                      ? "Draft a starter structure by choosing dimensions, materials, and build pieces before sending it to the voxel editor."
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
