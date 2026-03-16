import type { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  action,
  children,
  className = "",
  description,
  eyebrow,
  title,
}: SectionCardProps) {
  return (
    <section
      className={`rounded-[28px] border border-[color:var(--line)]/70 bg-[color:var(--card)]/90 p-6 shadow-[0_20px_60px_rgba(18,39,63,0.08)] backdrop-blur ${className}`.trim()}
    >
      {(title || eyebrow || description || action) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--accent-2)]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="font-display text-2xl text-[color:var(--foreground)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
