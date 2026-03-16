"use client";

import { useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";

import { HelperPanel } from "@/components/pokemon/helper-panel";
import { MaterialsBreakdown } from "@/components/materials/materials-breakdown";
import { SectionCard } from "@/components/ui/section-card";
import { summarizeMaterials } from "@/lib/materials";
import type { ScanBlueprintResult } from "@/lib/types";
import { useBuilderStore } from "@/store/use-builder-store";

export function ScreenshotUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanBlueprintResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDropAccepted: (acceptedFiles) => {
      setFile(acceptedFiles[0] ?? null);
      setError(null);
      setResult(null);
    },
    onDropRejected: () => {
      setError("Upload a single JPG, PNG, or WEBP under 10MB.");
    },
  });

  async function handleGenerate() {
    if (!file) {
      setError("Choose a screenshot first.");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/scan-build", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as ScanBlueprintResult & {
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error ?? "Scan request failed.");
      return;
    }

    startTransition(() => {
      setResult(payload);
    });
  }

  const summary = result ? summarizeMaterials(result.blueprint) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <SectionCard
        eyebrow="AI Draft"
        title="Screenshot to Blueprint"
        description="This first pass returns an approximate shell so you can jump straight into editing instead of rebuilding from scratch."
      >
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition ${
              isDragActive
                ? "border-[color:var(--accent-2)] bg-[color:var(--accent-2)]/10"
                : "border-[color:var(--line)] bg-[color:var(--surface)]"
            }`}
          >
            <input {...getInputProps()} />
            <p className="font-display text-2xl text-[color:var(--foreground)]">
              Drop a structure screenshot here
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Supported: JPG, PNG, WEBP up to 10MB.
            </p>
          </div>
          {file ? (
            <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent-2)]">
                Selected file
              </p>
              <p className="mt-2 font-display text-xl text-[color:var(--foreground)]">
                {file.name}
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!file || isPending}
            className="w-full rounded-2xl bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-[color:var(--background)] disabled:opacity-60"
          >
            {isPending ? "Generating blueprint..." : "Generate blueprint"}
          </button>
          {error ? (
            <p className="rounded-2xl bg-[#ffebe6] px-4 py-3 text-sm text-[#9e3a1f]">
              {error}
            </p>
          ) : null}
        </div>
      </SectionCard>
      {result && summary ? (
        <div className="space-y-6">
          <SectionCard
            title={result.blueprint.name}
            description="The generated shell is meant to be edited further in the 3D builder."
            action={
              <button
                type="button"
                onClick={() => {
                  useBuilderStore.getState().loadBlueprint(result.blueprint);
                  router.push("/builder");
                }}
                className="rounded-2xl bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-[color:var(--background)]"
              >
                Send to builder
              </button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Blocks
                </p>
                <p className="mt-1 font-display text-2xl">{summary.totalBlocks}</p>
              </div>
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Footprint
                </p>
                <p className="mt-1 font-display text-2xl">
                  {summary.footprint.width} x {summary.footprint.depth}
                </p>
              </div>
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">
                  Height
                </p>
                <p className="mt-1 font-display text-2xl">
                  {summary.footprint.height}
                </p>
              </div>
            </div>
          </SectionCard>
          <MaterialsBreakdown
            title="Detected Materials"
            materials={summary.materials}
            totalBlocks={summary.totalBlocks}
          />
          <HelperPanel helpers={summary.helpers} title="Suggested Build Crew" />
        </div>
      ) : null}
    </div>
  );
}
