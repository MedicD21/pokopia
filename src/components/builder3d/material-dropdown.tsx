"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { blockMaterials } from "@/data/materials";
import type { BlockMaterialDefinition, BlockMaterialId } from "@/lib/types";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MaterialPreview({
  material,
  size = 40,
}: {
  material: BlockMaterialDefinition;
  size?: number;
}) {
  if (material.imageUrl) {
    return (
      <Image
        src={material.imageUrl}
        alt={material.displayName}
        width={size}
        height={size}
        sizes={`${size}px`}
        className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] object-contain p-1.5"
      />
    );
  }

  return (
    <span
      className="rounded-xl border border-black/10"
      style={{
        width: size,
        height: size,
        backgroundColor: material.color,
      }}
      aria-hidden="true"
    />
  );
}

export function BlockMaterialDropdown({
  label,
  value,
  onChange,
  description,
  materials = blockMaterials,
}: {
  label: string;
  value: BlockMaterialId;
  onChange: (material: BlockMaterialId) => void;
  description?: string;
  materials?: readonly BlockMaterialDefinition[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedMaterial =
    materials.find((material) => material.id === value) ?? materials[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[color:var(--muted)]">{label}</p>
        {description ? (
          <p className="text-xs leading-5 text-[color:var(--muted)]">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-3 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          <MaterialPreview material={selectedMaterial} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
              {selectedMaterial.displayName}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-[color:var(--surface-strong)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                {selectedMaterial.category}
              </span>
              <span
                className="h-2.5 w-2.5 rounded-full border border-black/10"
                style={{ backgroundColor: selectedMaterial.color }}
              />
            </div>
          </div>
        </div>
        <Chevron open={open} />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-[22px] border border-[color:var(--line)] bg-[color:var(--card)] p-2 shadow-[0_18px_44px_rgba(0,0,0,0.34)]"
        >
          <div className="space-y-2">
            {materials.map((material) => {
              const active = material.id === selectedMaterial.id;

              return (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => {
                    onChange(material.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    active
                      ? "bg-[color:var(--accent)]/14 text-[color:var(--foreground)]"
                      : "bg-[color:var(--surface)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-strong)]"
                  }`}
                >
                  <MaterialPreview material={material} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{material.displayName}</p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                      {material.location}
                    </p>
                  </div>
                  <span
                    className="h-3 w-3 rounded-full border border-black/10"
                    style={{ backgroundColor: material.color }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
