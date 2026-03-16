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

type TilePoint = { x: number; y: number };
type DrawMode = "brush" | "line" | "rectangle" | "fill";

function roundToTile(value: number, tileSize: number) {
  return Math.floor(value / tileSize);
}

function tileKey(x: number, y: number) {
  return `${x}:${y}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function uniqueTiles(tiles: TilePoint[]) {
  const seen = new Set<string>();

  return tiles.filter((tile) => {
    const key = tileKey(tile.x, tile.y);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function expandBrush(center: TilePoint, brushSize: number, width: number, height: number) {
  const radius = brushSize - 1;
  const tiles: TilePoint[] = [];

  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      tiles.push({
        x: clamp(center.x + dx, 0, width - 1),
        y: clamp(center.y + dy, 0, height - 1),
      });
    }
  }

  return uniqueTiles(tiles);
}

function getLineTiles(start: TilePoint, end: TilePoint) {
  const tiles: TilePoint[] = [];
  const deltaX = Math.abs(end.x - start.x);
  const deltaY = Math.abs(end.y - start.y);
  const stepX = start.x < end.x ? 1 : -1;
  const stepY = start.y < end.y ? 1 : -1;
  let error = deltaX - deltaY;
  let x = start.x;
  let y = start.y;

  while (true) {
    tiles.push({ x, y });

    if (x === end.x && y === end.y) {
      break;
    }

    const doubled = error * 2;

    if (doubled > -deltaY) {
      error -= deltaY;
      x += stepX;
    }

    if (doubled < deltaX) {
      error += deltaX;
      y += stepY;
    }
  }

  return tiles;
}

function getRectangleTiles(start: TilePoint, end: TilePoint) {
  const tiles: TilePoint[] = [];
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}

function signatureForTile(tile: GridTile | null | undefined) {
  if (!tile) {
    return "empty";
  }

  if (tile.tileType === "road") {
    return `road:${tile.roadType ?? "unknown"}`;
  }

  if (tile.tileType === "decoration") {
    return `decoration:${tile.decorationType ?? "unknown"}`;
  }

  return tile.tileType;
}

export function PlannerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragActiveRef = useRef(false);
  const paintActiveRef = useRef(false);
  const [hoveredTile, setHoveredTile] = useState<TilePoint | null>(null);
  const [selectedTile, setSelectedTile] = useState<TilePoint | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>("brush");
  const [brushSize, setBrushSize] = useState(1);
  const [drawStart, setDrawStart] = useState<TilePoint | null>(null);
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
  const updateSelectedPlacementLabel = useMapStore(
    (state) => state.updateSelectedPlacementLabel,
  );
  const duplicateSelectedPlacement = useMapStore(
    (state) => state.duplicateSelectedPlacement,
  );
  const nudgeSelectedPlacement = useMapStore((state) => state.nudgeSelectedPlacement);
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

  function applyTileOperation(tile: TilePoint) {
    if (tool === "road") {
      paintRoad(tile.x, tile.y);
      return;
    }

    if (tool === "decoration") {
      paintDecoration(tile.x, tile.y);
      return;
    }

    if (tool === "delete") {
      deleteAt(tile.x, tile.y);
    }
  }

  function applyDrawTiles(points: TilePoint[]) {
    const expanded =
      drawMode === "brush"
        ? uniqueTiles(
            points.flatMap((point) => expandBrush(point, brushSize, width, height)),
          )
        : uniqueTiles(points);

    expanded.forEach(applyTileOperation);
  }

  function floodFillFrom(tile: TilePoint) {
    const originPlacement = findPlacementAtTile(placements, tile.x, tile.y);

    if (originPlacement) {
      if (tool === "delete") {
        deleteAt(tile.x, tile.y);
      }

      return;
    }

    const originSignature = signatureForTile(tiles[tileKey(tile.x, tile.y)]);
    const queue: TilePoint[] = [tile];
    const visited = new Set<string>();
    const matches: TilePoint[] = [];

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current) {
        continue;
      }

      const key = tileKey(current.x, current.y);

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      if (findPlacementAtTile(placements, current.x, current.y)) {
        continue;
      }

      if (signatureForTile(tiles[key]) !== originSignature) {
        continue;
      }

      matches.push(current);

      if (current.x > 0) {
        queue.push({ x: current.x - 1, y: current.y });
      }
      if (current.x < width - 1) {
        queue.push({ x: current.x + 1, y: current.y });
      }
      if (current.y > 0) {
        queue.push({ x: current.x, y: current.y - 1 });
      }
      if (current.y < height - 1) {
        queue.push({ x: current.x, y: current.y + 1 });
      }
    }

    applyDrawTiles(matches);
  }

  function applyEyedropper(tile: TilePoint) {
    const placement = findPlacementAtTile(placements, tile.x, tile.y);

    if (placement) {
      selectPlacement(placement.id);
      setSelectedBuildingId(placement.buildingId);
      setTool("building");
      setSelectedTile(null);
      return;
    }

    const tileRecord = tiles[tileKey(tile.x, tile.y)];

    if (!tileRecord) {
      return;
    }

    setSelectedTile(tile);

    if (tileRecord.tileType === "road" && tileRecord.roadType) {
      setRoadType(tileRecord.roadType);
      setTool("road");
    }

    if (tileRecord.tileType === "decoration" && tileRecord.decorationType) {
      setDecorationType(tileRecord.decorationType);
      setTool("decoration");
    }
  }

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

    context.fillStyle = "#0d1728";
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
        placement.id === selectedPlacementId ? "#ff9d45" : "rgba(219, 231, 255, 0.4)";
      context.strokeRect(px, py, boxWidth, boxHeight);

      if (tileSize > 8) {
        context.fillStyle = "#eef4ff";
        context.font = "600 10px var(--font-mono)";
        context.fillText(
          placement.label,
          px + 4,
          py + Math.min(boxHeight / 2, 16),
          Math.max(boxWidth - 8, 24),
        );
      }
    });

    if (
      drawStart &&
      hoveredTile &&
      (tool === "road" || tool === "decoration" || tool === "delete") &&
      (drawMode === "line" || drawMode === "rectangle")
    ) {
      const previewTiles =
        drawMode === "line"
          ? getLineTiles(drawStart, hoveredTile)
          : getRectangleTiles(drawStart, hoveredTile);

      uniqueTiles(previewTiles).forEach((tile) => {
        context.fillStyle = "rgba(255, 157, 69, 0.25)";
        context.fillRect(
          offsetX + tile.x * tileSize,
          offsetY + tile.y * tileSize,
          tileSize,
          tileSize,
        );
      });
    }

    context.strokeStyle = "rgba(171, 193, 228, 0.12)";
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
    brushSize,
    drawMode,
    drawStart,
    height,
    hoveredTile,
    placements,
    selectedPlacementId,
    selectedTileForDisplay,
    tiles,
    tool,
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

  function handleHandTool(tile: TilePoint) {
    const placement = findPlacementAtTile(placements, tile.x, tile.y);

    if (placement) {
      selectPlacement(placement.id);
      setSelectedTile(null);
      dragActiveRef.current = true;
      return;
    }

    selectPlacement(null);
    setSelectedTile(tiles[tileKey(tile.x, tile.y)] ? tile : null);
  }

  function handleTileAction(tile: TilePoint) {
    if (tool === "hand") {
      handleHandTool(tile);
      return;
    }

    if (tool === "eyedropper") {
      applyEyedropper(tile);
      return;
    }

    if (tool === "building") {
      setSelectedTile(null);
      placeBuilding(tile.x, tile.y);
      return;
    }

    if (tool === "road" || tool === "decoration" || tool === "delete") {
      setSelectedTile(null);

      if (drawMode === "fill") {
        floodFillFrom(tile);
        return;
      }

      if (drawMode === "brush") {
        applyDrawTiles([tile]);
        paintActiveRef.current = true;
        return;
      }

      setDrawStart(tile);
    }
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
    <div className="grid min-h-[calc(100vh-10rem)] gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <SectionCard
        eyebrow="Phase 3"
        title="2D Town Planner"
        description="The planner now supports brush, line, rectangle, fill, eyedropper, placement duplication, and precise nudging for a more complete editing workflow."
        className="flex min-h-[calc(100vh-11rem)] flex-col"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[24px] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--muted)]">
          <span>Hand: select and move placed buildings.</span>
          <span>Eyedropper: sample existing map content.</span>
          <span>Brush, line, rectangle, and fill work with roads, decorations, and delete.</span>
        </div>
        <div className="min-h-[720px] flex-1 overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface-strong)]">
          <canvas
            ref={canvasRef}
            className={`h-full w-full touch-none ${
              tool === "hand" ? "cursor-grab" : tool === "eyedropper" ? "cursor-copy" : "cursor-crosshair"
            }`}
            onPointerDown={(event) => {
              const tile = getTileCoordinates(event);

              if (!tile) {
                return;
              }

              handleTileAction(tile);
            }}
            onPointerMove={(event) => {
              const tile = getTileCoordinates(event);
              setHoveredTile(tile);

              if (dragActiveRef.current && tile) {
                moveSelectedPlacement(tile.x, tile.y);
              }

              if (
                paintActiveRef.current &&
                tile &&
                (tool === "road" || tool === "decoration" || tool === "delete") &&
                drawMode === "brush"
              ) {
                applyDrawTiles([tile]);
              }
            }}
            onPointerLeave={() => {
              setHoveredTile(null);
              dragActiveRef.current = false;
              paintActiveRef.current = false;
            }}
            onPointerUp={(event) => {
              const tile = getTileCoordinates(event);

              if (
                drawStart &&
                tile &&
                (tool === "road" || tool === "decoration" || tool === "delete")
              ) {
                if (drawMode === "line") {
                  applyDrawTiles(getLineTiles(drawStart, tile));
                }

                if (drawMode === "rectangle") {
                  applyDrawTiles(getRectangleTiles(drawStart, tile));
                }
              }

              dragActiveRef.current = false;
              paintActiveRef.current = false;
              setDrawStart(null);
            }}
          />
        </div>
      </SectionCard>
      <div className="space-y-5 xl:sticky xl:top-28 xl:self-start">
        <SectionCard
          title="Planner Controls"
          description="Choose the active tool, switch drawing modes, and tune the stamp behavior."
        >
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[color:var(--muted)]">
                Town name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["hand", "road", "building", "decoration", "eyedropper", "delete"] as const).map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setTool(option);

                      if (option === "building" || option === "hand" || option === "eyedropper") {
                        setDrawStart(null);
                      }
                    }}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold capitalize ${
                      tool === option
                        ? "bg-[color:var(--foreground)] text-[color:var(--background)]"
                        : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
                    }`}
                  >
                    {option}
                  </button>
                ),
              )}
            </div>
            {tool === "road" || tool === "decoration" || tool === "delete" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {(["brush", "line", "rectangle", "fill"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDrawMode(mode)}
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold capitalize ${
                        drawMode === mode
                          ? "bg-[color:var(--accent)]/20 text-[color:var(--foreground)]"
                          : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                {drawMode === "brush" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[color:var(--muted)]">
                        Brush size
                      </span>
                      <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-sm font-semibold">
                        {brushSize}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={1}
                      value={brushSize}
                      onChange={(event) => setBrushSize(Number(event.target.value))}
                      className="w-full accent-[color:var(--accent)]"
                    />
                  </div>
                ) : null}
              </>
            ) : null}
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
                        : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
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
                        : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
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
                  Blueprint stamp
                </span>
                <select
                  value={selectedBuildingId}
                  onChange={(event) => setSelectedBuildingId(event.target.value)}
                  className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
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
                className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
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
          description="Selected placements can be renamed, nudged, rotated, duplicated, and reused as the current stamp."
        >
          {selectedPlacement ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
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
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--muted)]">
                  Label
                </span>
                <input
                  value={selectedPlacement.label}
                  onChange={(event) => updateSelectedPlacementLabel(event.target.value)}
                  className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
                />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => nudgeSelectedPlacement(0, -1)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={rotateSelectedPlacement}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Rotate
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelectedPlacement(0, 1)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelectedPlacement(-1, 0)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Left
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBuildingId(selectedPlacement.buildingId);
                    setTool("building");
                  }}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Use stamp
                </button>
                <button
                  type="button"
                  onClick={() => nudgeSelectedPlacement(1, 0)}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Right
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={duplicateSelectedPlacement}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedPlacement}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : selectedTileRecord ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-4">
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
                          : "bg-[color:var(--surface-strong)]"
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
                          : "bg-[color:var(--surface-strong)]"
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
                className="w-full rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
              >
                Delete tile
              </button>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              Nothing selected yet. Use the hand tool or eyedropper to inspect what is already on the map.
            </p>
          )}
        </SectionCard>
        <SectionCard
          title="Map Snapshot"
          description="Roads and decorations use sparse tile storage while buildings remain separate, rotatable placements."
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
