"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SiteNav } from "@/components/layout/site-nav";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const editorMode = pathname === "/map" || pathname === "/builder";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,157,69,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(66,211,189,0.12),transparent_32%),radial-gradient(circle_at_bottom,rgba(125,166,255,0.12),transparent_34%)]" />
      <div
        className={`relative ${
          editorMode
            ? "mx-auto max-w-[min(100vw-16px,1920px)] px-2 py-3 sm:px-3 lg:px-4"
            : "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
        }`}
      >
        <header
          className={`sticky top-3 z-20 rounded-[32px] border border-[color:var(--line)] bg-[color:var(--panel)] shadow-[0_22px_60px_rgba(0,0,0,0.36)] backdrop-blur ${
            editorMode ? "px-4 py-4 sm:px-5" : "px-5 py-5 sm:px-7"
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Link href="/home" className="inline-flex items-center gap-4">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--foreground)]/45 bg-[radial-gradient(circle_at_35%_30%,rgba(242,160,39,0.28),rgba(17,27,44,0.94)_72%)] shadow-[0_16px_34px_rgba(0,0,0,0.32)]">
                  <span className="absolute inset-[6px] rounded-full border border-[color:var(--foreground)]/18 bg-[color:var(--surface)]/95" />
                  <Image
                    src="/branding/pokopia-logo.png"
                    alt="Pokopia Planner logo"
                    width={512}
                    height={512}
                    sizes="64px"
                    priority
                    className="relative z-10 h-11 w-11 object-contain"
                  />
                </span>
                <span className="flex flex-col">
                  <span className="font-display text-2xl text-[color:var(--foreground)]">
                    Pokopia Planner
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-2)]">
                    Town + Build Studio
                  </span>
                </span>
              </Link>
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
                Town layout, voxel buildings, material planning, and helper recommendations for an original monster-building world.
              </p>
            </div>
            <SiteNav />
          </div>
        </header>
        <main className={editorMode ? "pb-6 pt-4" : "pb-14 pt-8"}>{children}</main>
      </div>
    </div>
  );
}
