interface MetricPillProps {
  label: string;
  value: string | number;
  accent?: "orange" | "teal" | "blue";
}

const accentClasses: Record<NonNullable<MetricPillProps["accent"]>, string> = {
  orange: "bg-[color:var(--accent)]/18 text-[color:var(--foreground)]",
  teal: "bg-[color:var(--accent-2)]/18 text-[color:var(--foreground)]",
  blue: "bg-[#7da6ff]/18 text-[color:var(--foreground)]",
};

export function MetricPill({
  accent = "orange",
  label,
  value,
}: MetricPillProps) {
  return (
    <div
      className={`rounded-full border border-[color:var(--line)] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${accentClasses[accent]}`}
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}
