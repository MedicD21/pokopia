"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationItems } from "@/lib/navigation";

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap justify-end gap-2">
      {navigationItems.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
              active
                ? "bg-[color:var(--foreground)] text-[color:var(--background)] shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
                : "bg-[color:var(--surface)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-hover)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
