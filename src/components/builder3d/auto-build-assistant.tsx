"use client";

import { startTransition, useState, useTransition } from "react";

import { blockMaterials } from "@/data/materials";
import { createAutoBuildBlueprint } from "@/lib/auto-build";
import type {
  AutoBuildOptions,
  AutoBuildStyle,
  BlockMaterialId,
  BuildingData,
} from "@/lib/types";

const styleOptions: Array<{
  value: AutoBuildStyle;
  label: string;
  description: string;
}> = [
  // {
  //   value: "cottage",
  //   label: "Cottage",
  //   description: "Compact stepped roof and cozy home proportions.",
  // },
  // {
  //   value: "hall",
  //   label: "Hall",
  //   description: "Wider civic shell with a long stepped roofline.",
  // },
  // {
  //   value: "workshop",
  //   label: "Workshop",
  //   description: "Flat industrial roof with heavier support framing.",
  // },
  // {
  //   value: "greenhouse",
  //   label: "Greenhouse",
  //   description: "Glass-forward shell with a framed roof spine.",
  // },
];

const itemSlotDefinitions: Array<{
  id:
    | "includeDoor"
    | "includeWindows"
    | "includeBeams"
    | "includePillars"
    | "includeLights"
    | "includeDecor";
  label: string;
  materialKey:
    | "doorMaterial"
    | "windowMaterial"
    | "beamMaterial"
    | "pillarMaterial"
    | "lightMaterial"
    | "decorMaterial";
}> = [
  { id: "includeDoor", label: "Door", materialKey: "doorMaterial" },
  { id: "includeWindows", label: "Windows", materialKey: "windowMaterial" },
  { id: "includeBeams", label: "Beams", materialKey: "beamMaterial" },
  { id: "includePillars", label: "Pillars", materialKey: "pillarMaterial" },
  { id: "includeLights", label: "Lights", materialKey: "lightMaterial" },
  { id: "includeDecor", label: "Decor", materialKey: "decorMaterial" },
];

const defaultOptions: AutoBuildOptions = {
  prompt: "",
  style: "cottage",
  width: 8,
  depth: 8,
  wallHeight: 4,
  roofHeight: 2,
  foundationMaterial: "stone",
  wallMaterial: "brick",
  trimMaterial: "wood",
  roofMaterial: "roof",
  doorMaterial: "door",
  windowMaterial: "window",
  beamMaterial: "beam",
  pillarMaterial: "pillar",
  lightMaterial: "light",
  decorMaterial: "decor",
  includeDoor: true,
  includeWindows: true,
  includeBeams: true,
  includePillars: true,
  includeLights: true,
  includeDecor: false,
};

function MaterialSelect({
  value,
  onChange,
}: {
  value: BlockMaterialId;
  onChange: (value: BlockMaterialId) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as BlockMaterialId)}
      className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-sm outline-none"
    >
      {blockMaterials.map((material) => (
        <option key={material.id} value={material.id}>
          {material.displayName}
        </option>
      ))}
    </select>
  );
}

export function AutoBuildAssistant({
  onGenerate,
}: {
  onGenerate: (blueprint: BuildingData, options: AutoBuildOptions) => void;
}) {
  const [options, setOptions] = useState<AutoBuildOptions>(defaultOptions);
  const [isPending, startBuildTransition] = useTransition();

  function updateOption<Key extends keyof AutoBuildOptions>(
    key: Key,
    value: AutoBuildOptions[Key],
  ) {
    setOptions((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleGenerate() {
    startBuildTransition(() => {
      startTransition(() => {
        const blueprint = createAutoBuildBlueprint(options);
        onGenerate(blueprint, options);
      });
    });
  }

  return (
    <div className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-2)]">
            Auto Build Assistant
          </p>
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
            Pick a shell style, dimensions, materials, and optional build
            pieces, then auto-generate a starter structure directly into the
            live voxel scene.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="rounded-2xl border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] disabled:cursor-progress disabled:opacity-60"
        >
          {isPending ? "Generating build..." : "Generate build"}
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[color:var(--muted)]">
            Build idea
          </span>
          <input
            value={options.prompt}
            onChange={(event) => updateOption("prompt", event.target.value)}
            placeholder="Cozy mountain inn, seaside forge, glass flower house..."
            className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none"
          />
        </label>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {styleOptions.map((style) => {
            const isActive = options.style === style.value;

            return (
              <button
                key={style.value}
                type="button"
                onClick={() => updateOption("style", style.value)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-[color:var(--accent)]/60 bg-[color:var(--accent)]/14 text-[color:var(--foreground)]"
                    : "border-[color:var(--line)] bg-[color:var(--surface)] text-[color:var(--foreground)]"
                }`}
              >
                <p className="text-sm font-semibold">{style.label}</p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
                  {style.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[color:var(--muted)]">
              Width
            </span>
            <input
              type="number"
              min={5}
              max={20}
              value={options.width}
              onChange={(event) =>
                updateOption("width", Number(event.target.value))
              }
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[color:var(--muted)]">
              Depth
            </span>
            <input
              type="number"
              min={5}
              max={20}
              value={options.depth}
              onChange={(event) =>
                updateOption("depth", Number(event.target.value))
              }
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[color:var(--muted)]">
              Wall height
            </span>
            <input
              type="number"
              min={3}
              max={8}
              value={options.wallHeight}
              onChange={(event) =>
                updateOption("wallHeight", Number(event.target.value))
              }
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[color:var(--muted)]">
              Roof height
            </span>
            <input
              type="number"
              min={1}
              max={4}
              value={options.roofHeight}
              onChange={(event) =>
                updateOption("roofHeight", Number(event.target.value))
              }
              className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-3 text-sm outline-none"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[color:var(--muted)]">
              Foundation
            </span>
            <MaterialSelect
              value={options.foundationMaterial}
              onChange={(value) => updateOption("foundationMaterial", value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[color:var(--muted)]">
              Wall
            </span>
            <MaterialSelect
              value={options.wallMaterial}
              onChange={(value) => updateOption("wallMaterial", value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[color:var(--muted)]">
              Trim
            </span>
            <MaterialSelect
              value={options.trimMaterial}
              onChange={(value) => updateOption("trimMaterial", value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-[color:var(--muted)]">
              Roof
            </span>
            <MaterialSelect
              value={options.roofMaterial}
              onChange={(value) => updateOption("roofMaterial", value)}
            />
          </label>
        </div>

        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {itemSlotDefinitions.map((slot) => (
            <div
              key={slot.id}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-4"
            >
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-[color:var(--foreground)]">
                  {slot.label}
                </span>
                <input
                  type="checkbox"
                  checked={options[slot.id]}
                  onChange={(event) =>
                    updateOption(slot.id, event.target.checked)
                  }
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
              </label>
              <div className="mt-3">
                <MaterialSelect
                  value={options[slot.materialKey]}
                  onChange={(value) => updateOption(slot.materialKey, value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
          <span className="rounded-full bg-[color:var(--surface)] px-3 py-2">
            Footprint {options.width}x{options.depth}
          </span>
          <span className="rounded-full bg-[color:var(--surface)] px-3 py-2">
            Wall Y {options.wallHeight}
          </span>
          <span className="rounded-full bg-[color:var(--surface)] px-3 py-2">
            Roof {options.roofHeight} layers
          </span>
          <span className="rounded-full bg-[color:var(--surface)] px-3 py-2">
            Style{" "}
            {styleOptions.find((style) => style.value === options.style)?.label}
          </span>
        </div>
      </div>
    </div>
  );
}
