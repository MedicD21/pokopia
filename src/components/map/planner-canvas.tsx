"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { SectionCard } from "@/components/ui/section-card";
import {
  getRotatedFootprint,
  sampleBuildingLookup,
  sampleBuildings,
} from "@/data/buildings";
import type { GridTile, StorageMode } from "@/lib/types";
import { findPlacementAtTile, useMapStore } from "@/store/use-map-store";

const roadColors: Record<NonNullable<GridTile["roadType"]>, string> = {
  dirt: "#bf8a5b",
  stone: "#8792ab",
  wood: "#b77741",
  bridge: "#5f83a1",
  path: "#d0b583",
};

const decorationColors: Record<string, string> = {
  tree: "#3e9a67",
  lamp: "#f4d46a",
  flower: "#f08ba3",
};

const themeColors: Record<string, string> = {
  community: "#f59c74",
  industrial: "#7e91b1",
  garden: "#6fc28e",
  custom: "#d6b8ff",
};

function roundToTile(value: number, tileSize: number) {
  return Math.floor(value / tileSize);
}

function tileKey(x: number, y: number) {
  return `${x}:${y}`;
}

export function PlannerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragActiveRef = useRef(false);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const width = useMapStore((state) => state.width);
  const height = useMapStore((state) => state.height);
  const name = useMapStore((state) => state.name);
  const tiles = useMapStore((state) => state.tiles);
  const placements = useMapStore((state) => state.placements);
  const tool = useMapStore((state) => state.tool);
  const roadType = useMapStore((state) => state.roadType);
  const decorationType = useMapStore((state) => state.decorationType);
  const selectedBuildingId = useMapStore((state) => state.selectedBuildingId);
  const selectedPlacementId = useMapStore((state) => state.selectedPlacementId);
  const setName = useMapStore((state) => state.setName);
  const setTool = useMapStore((state) => state.setTool);
  const setRoadType = useMapStore((state) => state.setRoadType);
  const setDecorationType = useMapStore((state) => state.setDecorationType);
  const setSelectedBuildingId = useMapStore((state) => state.setSelectedBuildingId);
  const selectPlacement = useMapStore((state) => state.selectPlacement);
  const paintRoad = useMapStore((state) => state.paintRoad);
  const paintDecoration = useMapStore((state) => state.paintDecoration);
  const placeBuilding = useMapStore((state) => state.placeBuilding);
  const moveSelectedPlacement = useMapStore((state) => state.moveSelectedPlacement);
  const rotateSelectedPlacement = useMapStore((state) => state.rotateSelectedPlacement);
  const deleteSelectedPlacement = useMapStore((state) => state.deleteSelectedPlacement);
  const deleteAt = useMapStore((state) => state.deleteAt);
  const resetMap = useMapStore((state) => state.resetMap);
  const exportMap = useMapStore((state) => state.exportMap);

  const selectedPlacement =
    placements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedTileRecord = selectedTile
    ? tiles[tileKey(selectedTile.x, selectedTile.y)] ?? null
    : null;
  const selectedTileForDisplay =
    selectedTile && selectedTileRecord ? selectedTile : null;

  const redrawCanvas = useEffectEvent(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);

    const mapSize = Math.min(rect.width, rect.height);
    const offsetX = (rect.width - mapSize) / 2;
    const offsetY = (rect.height - mapSize) / 2;
    const tileSize = mapSize / width;

    context.fillStyle = "#f7efe0";
    context.fillRect(offsetX, offsetY, mapSize, mapSize);

    Object.values(tiles).forEach((tile) => {
      const px = offsetX + tile.x * tileSize;
      const py = offsetY + tile.y * tileSize;

      if (tile.tileType === "road" && tile.roadType) {
        context.fillStyle = roadColors[tile.roadType];
        context.fillRect(px, py, tileSize, tileSize);
      }

      if (tile.tileType === "decoration" && tile.decorationType) {
        context.fillStyle = decorationColors[tile.decorationType] ?? "#74b48f";
        context.beginPath();
        context.arc(
          px + tileSize / 2,
          py + tileSize / 2,
          Math.max(tileSize / 3, 1.5),
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    });

    placements.forEach((placement) => {
      const building = sampleBuildingLookup[placement.buildingId];

      if (!building) {
        return;
      }

      const footprint = getRotatedFootprint(building, placement.rotation);
      const px = offsetX + placement.x * tileSize;
      const py = offsetY + placement.y * tileSize;
      const boxWidth = footprint.width * tileSize;
      const boxHeight = footprint.depth * tileSize;

      context.fillStyle = themeColors[building.theme] ?? "#7da6ff";
      context.globalAlpha = 0.82;
      context.fillRect(px, py, boxWidth, boxHeight);
      context.globalAlpha = 1;
      context.lineWidth = placement.id === selectedPlacementId ? 2.5 : 1;
      context.strokeStyle =
        placement.id === selectedPlacementId ? "#11253d" : "rgba(17, 37, 61, 0.65)";
      context.strokeRect(px, py, boxWidth, boxHeight);

      if (tileSize > 8) {
        context.fillStyle = "#11253d";
        context.font = "600 10px var(--font-mono)";
        context.fillText(
          building.name,
          px + 4,
          py + Math.min(boxHeight / 2, 16),
          Math.max(boxWidth - 8, 24),
        );
      }
    });

    context.strokeStyle = "rgba(28, 46, 69, 0.14)";
    context.lineWidth = 1;

    for (let index = 0; index <= width; index += 1) {
      const position = offsetX + index * tileSize;
      context.beginPath();
      context.moveTo(position, offsetY);
      context.lineTo(position, offsetY + mapSize);
      context.stroke();
    }

    for (let index = 0; index <= height; index += 1) {
      const position = offsetY + index * tileSize;
      context.beginPath();
      context.moveTo(offsetX, position);
      context.lineTo(offsetX + mapSize, position);
      context.stroke();
    }

    if (selectedTileForDisplay) {
      context.lineWidth = 3;
      context.strokeStyle = "#ff8a3d";
      context.strokeRect(
        offsetX + selectedTileForDisplay.x * tileSize,
        offsetY + selectedTileForDisplay.y * tileSize,
        tileSize,
        tileSize,
      );
    }

    if (hoveredTile) {
      context.fillStyle = "rgba(255, 138, 61, 0.18)";
      context.fillRect(
        offsetX + hoveredTile.x * tileSize,
        offsetY + hoveredTile.y * tileSize,
        tileSize,
        tileSize,
      );
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    redrawCanvas();
    const observer = new ResizeObserver(() => redrawCanvas());
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [
    height,
    hoveredTile,
    placements,
    selectedPlacementId,
    selectedTileForDisplay,
    tiles,
    width,
  ]);

  function getTileCoordinates(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const mapSize = Math.min(rect.width, rect.height);
    const offsetX = (rect.width - mapSize) / 2;
    const offsetY = (rect.height - mapSize) / 2;
    const tileSize = mapSize / width;
    const x = roundToTile(event.clientX - rect.left - offsetX, tileSize);
    const y = roundToTile(event.clientY - rect.top - offsetY, tileSize);

    if (x < 0 || y < 0 || x >= width || y >= height) {
      return null;
    }

    return { x, y };
  }

  function handleHandTool(tile: { x: number; y: number }) {
    const placement = findPlacementAtTile(placements, tile.x, tile.y);

    if (placement) {
      selectPlacement(placement.id);
      setSelectedTile(null);
      dragActiveRef.current = true;
      return;
    }

    selectPlacement(null);
    setSelectedTile(
      tiles[tileKey(tile.x, tile.y)] ? tile : null,
    );
  }

  function handlePaint(tile: { x: number; y: number }) {
    if (tool === "hand") {
      handleHandTool(tile);
      return;
    }

    setSelectedTile(null);

    if (tool === "delete") {
      deleteAt(tile.x, tile.y);
      return;
    }

    if (tool === "building") {
      placeBuilding(tile.x, tile.y);
      return;
    }

    if (tool === "decoration") {
      paintDecoration(tile.x, tile.y);
      return;
    }

    paintRoad(tile.x, tile.y);
  }

  async function handleSaveMap() {
    const response = await fetch("/api/maps/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(exportMap()),
    });
    const payload = (await response.json()) as {
      storageMode?: StorageMode;
      error?: string;
    };

    if (response.ok) {
      setSaveMessage(
        payload.storageMode === "database"
          ? "Map saved to PostgreSQL through Prisma."
          : "Map snapshot saved to local fallback storage.",
      );
      return;
    }

    setSaveMessage(payload.error ?? "Unable to save map right now.");
  }

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <SectionCard
        eyebrow="Phase 3"
        title="2D Town Planner"
        description="Use the hand tool to grab and edit existing placements, or switch brushes to paint new roads, decorations, and building footprints."
        className="flex min-h-[calc(100vh-11rem)] flex-col"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[24px] bg-white/70 px-4 py-3 text-sm text-[color:var(--muted)]">
          <span>Hand: select and move existing items.</span>
          <span>Road/Decoration: paint directly on the grid.</span>
          <span>Building: place selected blueprint.</span>
        </div>
        <div className="min-h-[720px] flex-1 overflow-hidden rounded-[24px] border border-white/60 bg-white/80">
          <canvas
            ref={canvasRef}
            className={`h-full w-full touch-none ${
              tool === "hand" ? "cursor-grab" : "cursor-crosshair"
            }`}
            onPointerDown={(event) => {
              const tile = getTileCoordinates(event);

              if (!tile) {
                return;
              }

              handlePaint(tile);
            }}
            onPointerMove={(event) => {
              const tile = getTileCoordinates(event);
              setHoveredTile(tile);

              if (dragActiveRef.current && tile) {
                moveSelectedPlacement(tile.x, tile.y);
              }
            }}
            onPointerLeave={() => {
              setHoveredTile(null);
              dragActiveRef.current = false;
            }}
            onPointerUp={() => {
              dragActiveRef.current = false;
            }}
          />
        </div>
      </SectionCard>
      <div className="space-y-5 xl:sticky xl:top-28 xl:self-start">
        <SectionCard
          title="Planner Controls"
          description="The editor is intentionally large now, so the side panel focuses on tools and selection details."
        >
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[color:var(--muted)]">
                Town name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["hand", "road", "building", "decoration", "delete"] as const).map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTool(option)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold capitalize ${
                      tool === option
                        ? "bg-[color:var(--foreground)] text-[color:var(--background)]"
                        : "bg-white/70 text-[color:var(--foreground)]"
                    }`}
                  >
                    {option}
                  </button>
                ),
              )}
            </div>
            {tool === "road" ? (
              <div className="grid grid-cols-2 gap-3">
                {(["stone", "path", "dirt", "wood", "bridge"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRoadType(option)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold capitalize ${
                      roadType === option
                        ? "bg-[color:var(--accent)]/18 text-[color:var(--foreground)]"
                        : "bg-white/70 text-[color:var(--foreground)]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
            {tool === "decoration" ? (
              <div className="grid grid-cols-3 gap-3">
                {(["tree", "flower", "lamp"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDecorationType(option)}
                    className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold capitalize ${
                      decorationType === option
                        ? "bg-[color:var(--accent-2)]/18 text-[color:var(--foreground)]"
                        : "bg-white/70 text-[color:var(--foreground)]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
            {tool === "building" ? (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--muted)]">
                  Blueprint
                </span>
                <select
                  value={selectedBuildingId}
                  onChange={(event) => setSelectedBuildingId(event.target.value)}
                  className="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm outline-none"
                >
                  {sampleBuildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSaveMap}
                className="rounded-2xl bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-[color:var(--background)]"
              >
                Save map
              </button>
              <button
                type="button"
                onClick={resetMap}
                className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
              >
                Reset
              </button>
            </div>
            {saveMessage ? (
              <p className="text-sm leading-6 text-[color:var(--muted)]">{saveMessage}</p>
            ) : null}
          </div>
        </SectionCard>
        <SectionCard
          title="Selection Inspector"
          description="Use the hand tool to pick an existing building, road tile, or decoration tile."
        >
          {selectedPlacement ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/70 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.26em] text-[color:var(--accent-2)]">
                  Building Placement
                </p>
                <p className="mt-2 font-display text-2xl text-[color:var(--foreground)]">
                  {selectedPlacement.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  Position {selectedPlacement.x}, {selectedPlacement.y} with rotation{" "}
                  {selectedPlacement.rotation} degrees.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={rotateSelectedPlacement}
                  className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold"
                >
                  Rotate
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedPlacement}
                  className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : selectedTileRecord ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/70 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.26em] text-[color:var(--accent-2)]">
                  Tile
                </p>
                <p className="mt-2 font-display text-2xl text-[color:var(--foreground)]">
                  {selectedTileRecord.tileType}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                  Coordinates {selectedTileRecord.x}, {selectedTileRecord.y}
                </p>
              </div>
              {selectedTileRecord.tileType === "road" ? (
                <div className="grid grid-cols-2 gap-3">
                  {(["stone", "path", "dirt", "wood", "bridge"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (!selectedTile) {
                          return;
                        }

                        setRoadType(option);
                        paintRoad(selectedTile.x, selectedTile.y);
                      }}
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold capitalize ${
                        selectedTileRecord.roadType === option
                          ? "bg-[color:var(--accent)]/18"
                          : "bg-white/80"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
              {selectedTileRecord.tileType === "decoration" ? (
                <div className="grid grid-cols-3 gap-3">
                  {(["tree", "flower", "lamp"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (!selectedTile) {
                          return;
                        }

                        setDecorationType(option);
                        paintDecoration(selectedTile.x, selectedTile.y);
                      }}
                      className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold capitalize ${
                        selectedTileRecord.decorationType === option
                          ? "bg-[color:var(--accent-2)]/18"
                          : "bg-white/80"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (selectedTile) {
                    deleteAt(selectedTile.x, selectedTile.y);
                  }
                }}
                className="w-full rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold"
              >
                Delete tile
              </button>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              Nothing selected yet. Switch to the hand tool and click an existing item in the map.
            </p>
          )}
        </SectionCard>
        <SectionCard
          title="Map Snapshot"
          description="Sparse tile storage keeps roads and decorations lightweight while placements stay rotatable."
        >
          <div className="space-y-3 text-sm leading-6 text-[color:var(--muted)]">
            <p>
              Roads and decorations:{" "}
              <strong className="text-[color:var(--foreground)]">
                {Object.keys(tiles).length}
              </strong>
            </p>
            <p>
              Building placements:{" "}
              <strong className="text-[color:var(--foreground)]">
                {placements.length}
              </strong>
            </p>
            <p>
              Active tool:{" "}
              <strong className="text-[color:var(--foreground)]">{tool}</strong>
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
