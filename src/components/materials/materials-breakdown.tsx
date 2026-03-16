import { SectionCard } from "@/components/ui/section-card";
import type { MaterialCount } from "@/lib/types";

interface MaterialsBreakdownProps {
  title?: string;
  description?: string;
  materials: MaterialCount[];
  totalBlocks: number;
}

export function MaterialsBreakdown({
  description = "Counts are generated directly from the current voxel blueprint.",
  materials,
  title = "Materials List",
  totalBlocks,
}: MaterialsBreakdownProps) {
  return (
    <SectionCard title={title} description={description}>
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-[color:var(--surface)] px-4 py-3">
        <p className="text-sm font-semibold text-[color:var(--muted)]">
          Total tracked blocks
        </p>
        <p className="font-display text-2xl text-[color:var(--foreground)]">
          {totalBlocks}
        </p>
      </div>
      <div className="space-y-3">
        {materials.map((material) => (
          <div
            key={material.materialId}
            className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: material.color }}
                />
                <div>
                  <p className="font-display text-lg text-[color:var(--foreground)]">
                    {material.name}
                  </p>
                  <p className="text-sm leading-6 text-[color:var(--muted)]">
                    {material.obtainMethod} at {material.location}
                  </p>
                </div>
              </div>
              <p className="rounded-full bg-[color:var(--accent)]/14 px-3 py-1 text-sm font-semibold text-[color:var(--foreground)]">
                {material.count}
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Crafting: {material.craftingRecipe}. {material.notes}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
