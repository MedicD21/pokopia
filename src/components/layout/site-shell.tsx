import Link from "next/link";
import type { ReactNode } from "react";

import { SiteNav } from "@/components/layout/site-nav";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,214,127,0.35),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,183,161,0.24),transparent_32%),radial-gradient(circle_at_bottom,rgba(125,166,255,0.18),transparent_34%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/60 bg-white/55 px-5 py-5 shadow-[0_22px_60px_rgba(18,39,63,0.12)] backdrop-blur sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Link href="/home" className="inline-flex items-center gap-3">
                <span className="rounded-2xl bg-[color:var(--foreground)] px-3 py-2 font-display text-lg text-[color:var(--background)]">
                  Pokopia Planner
                </span>
              </Link>
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
                Town layout, voxel buildings, material planning, and helper recommendations for an original monster-building world.
              </p>
            </div>
            <SiteNav />
          </div>
        </header>
        <main className="pb-14 pt-8">{children}</main>
      </div>
    </div>
  );
}
