import { SectionCard } from "@/components/ui/section-card";
import type { PokemonRecommendation } from "@/lib/types";

export function HelperPanel({
  helpers,
  title = "Pokemon Builder Picks",
}: {
  helpers: PokemonRecommendation[];
  title?: string;
}) {
  return (
    <SectionCard
      title={title}
      description="Suggestions are based on the dominant material categories in the current plan."
    >
      <div className="space-y-3">
        {helpers.map((helper) => (
          <div
            key={helper.id}
            className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-lg text-[color:var(--foreground)]">
                  {helper.pokemonName}
                </p>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-2)]">
                  {helper.buildSkill}
                </p>
              </div>
              <p className="rounded-full bg-[color:var(--accent-2)]/14 px-3 py-1 text-sm font-semibold">
                {helper.type}
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              {helper.description}
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">
              {helper.reason}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
