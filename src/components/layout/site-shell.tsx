"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { SiteNav } from "@/components/layout/site-nav";

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [coffeeCollapsed, setCoffeeCollapsed] = useState(false);
  const editorMode =
    pathname === "/map" ||
    pathname === "/builder" ||
    pathname === "/ai-builder";

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setCoffeeCollapsed(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setCoffeeCollapsed(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, []);

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
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[color:var(--foreground)]/26 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(17,27,44,0.2))] p-[3px] shadow-[0_18px_36px_rgba(0,0,0,0.34)] sm:h-24 sm:w-24">
                  <Image
                    src="/branding/logo-20260316.png"
                    alt="Pokopia Planner logo"
                    width={512}
                    height={512}
                    sizes="(min-width: 640px) 96px, 80px"
                    priority
                    className="relative z-10 h-full w-full rounded-full object-contain"
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
                Town layout, voxel buildings, material planning, and helper
                recommendations for an original monster-building world.
              </p>
            </div>
            <SiteNav />
          </div>
        </header>
        <main className={editorMode ? "pb-6 pt-4" : "pb-14 pt-8"}>
          {children}
        </main>
      </div>
      <div className="fixed bottom-4 left-4 z-30 flex items-end gap-2">
        <a
          href="https://www.buymeacoffee.com/Dushin"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buy me a coffee"
          className="hidden transition hover:scale-[1.02] md:block"
        >
          <img
            src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=Dushin&button_colour=40DCA5&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00"
            alt="Buy me a coffee"
            className="h-auto w-[200px]"
            loading="lazy"
          />
        </a>
        {!coffeeCollapsed ? (
          <a
            href="https://www.buymeacoffee.com/Dushin"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Buy me a coffee"
            className="transition hover:scale-[1.02] md:hidden"
          >
            <img
              src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=Dushin&button_colour=40DCA5&font_colour=ffffff&font_family=Poppins&outline_colour=000000&coffee_colour=FFDD00"
              alt="Buy me a coffee"
              className="h-auto w-[200px] max-w-[60vw]"
              loading="lazy"
            />
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setCoffeeCollapsed((current) => !current)}
          aria-label={
            coffeeCollapsed
              ? "Expand Buy me a coffee button"
              : "Collapse Buy me a coffee button"
          }
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] text-sm font-bold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-hover)] md:hidden"
        >
          {coffeeCollapsed ? "→" : "←"}
        </button>
      </div>
    </div>
  );
}
