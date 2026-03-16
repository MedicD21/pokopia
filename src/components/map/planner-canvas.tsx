"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { SectionCard } from "@/components/ui/section-card";
import {
  getRotatedFootprint,
  sampleBuildingLookup,
  sampleBuildings,
} from "@/data/buildings";
import type { GridTile, StorageMode } from "@/lib/types";
import {
  findPlacementAtTile,
  type MapTool,
  useMapStore,
} from "@/store/use-map-store";

const roadColors: Record<string, string> = {
  // surface / finish types
  stone: "#8792ab",
  cobblestone: "#6b7285",
  tile: "#7f8cab",
  brick: "#c9603e",
  asphalt: "#4e5263",
  marked: "#3e4250",
  // natural / unpaved
  path: "#d0b583",
  dirt: "#bf8a5b",
  gravel: "#9a8e7d",
  sand: "#e0c87a",
  grass: "#5ab06a",
  // structural
  wood: "#b77741",
  bridge: "#5f83a1",
};

/** All road types drawn by default – matches the Block category surfaces in the item library. */
const defaultRoadOptions = [
  // paved / hard surfaces
  "stone",
  "cobblestone",
  "tile",
  "brick",
  "asphalt",
  "marked",
  // natural / soft
  "path",
  "dirt",
  "gravel",
  "sand",
  "grass",
  // structural
  "wood",
  "bridge",
];

const decorationColors: Record<string, string> = {
  // Trees (Nature category)
  tree: "#3e9a67",
  "palm-tree": "#5ecb7e",
  "pointy-tree": "#2e7d52",
  // Flowers & ground cover (Nature)
  flower: "#f08ba3",
  wildflower: "#e065a0",
  "mountain-flower": "#b981e0",
  // Hedges & grass (Nature)
  hedge: "#2d7045",
  "tall-grass": "#7dcf60",
  // Landscape features (Nature)
  boulder: "#8a8f9e",
  vine: "#4e9458",
  // Lighting (Outdoor)
  lamp: "#f4d46a",
  torch: "#f07032",
  // Power (Outdoor / custom)
  "electric-pole": "#ffe15a",
  // Water features (Outdoor)
  fountain: "#5ab4d4",
  "water-basin": "#6ac0d8",
  // Fire (Outdoor)
  campfire: "#f58c28",
  // Signage (Outdoor)
  sign: "#c8a86a",
  "information-board": "#a8c0e8",
  // Storage & objects (Outdoor)
  barrel: "#8f6240",
  planter: "#78b86c",
  mailbox: "#4a82d4",
  "trash-bin": "#6b7280",
  "weather-vane": "#9eb0c8",
  "vending-machine": "#40b8b8",
};

/** All decoration types drawn by default – matches Nature + Outdoor items in the item library. */
const defaultDecorationOptions = [
  // trees
  "tree",
  "palm-tree",
  "pointy-tree",
  // flowers & ground cover
  "flower",
  "wildflower",
  "mountain-flower",
  // hedges & grass
  "hedge",
  "tall-grass",
  // landscape
  "boulder",
  "vine",
  // lighting
  "lamp",
  "torch",
  // power
  "electric-pole",
  // water
  "fountain",
  "water-basin",
  // fire
  "campfire",
  // signage
  "sign",
  "information-board",
  // storage & objects
  "barrel",
  "planter",
  "mailbox",
  "trash-bin",
  "weather-vane",
  "vending-machine",
];

const themeColors: Record<string, string> = {
  community: "#f59c74",
  industrial: "#7e91b1",
  garden: "#6fc28e",
  custom: "#d6b8ff",
};

type TilePoint = { x: number; y: number };
type DrawMode = "brush" | "line" | "rectangle" | "fill";

const plannerToolDefinitions: ReadonlyArray<{
  tool: MapTool;
  label: string;
  shortcut: string;
}> = [
  { tool: "hand", label: "Hand", shortcut: "H" },
  { tool: "road", label: "Road", shortcut: "R" },
  { tool: "building", label: "Building", shortcut: "B" },
  { tool: "decoration", label: "Decoration", shortcut: "D" },
  { tool: "eyedropper", label: "Eyedropper", shortcut: "E" },
  { tool: "delete", label: "Delete", shortcut: "X" },
];

const drawModeDefinitions: ReadonlyArray<{
  mode: DrawMode;
  label: string;
  shortcut: string;
}> = [
  { mode: "brush", label: "Brush", shortcut: "1" },
  { mode: "line", label: "Line", shortcut: "2" },
  { mode: "rectangle", label: "Rectangle", shortcut: "3" },
  { mode: "fill", label: "Fill", shortcut: "4" },
];

const toolShortcutLookup: Partial<Record<string, MapTool>> = {
  h: "hand",
  r: "road",
  b: "building",
  d: "decoration",
  e: "eyedropper",
  x: "delete",
};

const drawModeShortcutLookup: Partial<Record<string, DrawMode>> = {
  "1": "brush",
  "2": "line",
  "3": "rectangle",
  "4": "fill",
};

function roundToTile(value: number, tileSize: number) {
  return Math.floor(value / tileSize);
}

function tileKey(x: number, y: number) {
  return `${x}:${y}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getPoleConnections(poles: TilePoint[], maxDistance: number) {
  const links: Array<{ from: TilePoint; to: TilePoint }> = [];

  for (let index = 0; index < poles.length; index += 1) {
    for (let candidate = index + 1; candidate < poles.length; candidate += 1) {
      const from = poles[index];
      const to = poles[candidate];

      if (Math.hypot(to.x - from.x, to.y - from.y) <= maxDistance) {
        links.push({ from, to });
      }
    }
  }

  return links;
}

function drawElectricPoleStamp(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
) {
  const centerX = px + tileSize / 2;
  const centerY = py + tileSize / 2;
  const radius = Math.max(tileSize / 3.4, 1.6);

  context.fillStyle = "#ffe15a";
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(74, 58, 6, 0.9)";
  context.lineWidth = Math.max(tileSize * 0.08, 1);
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();

  if (tileSize >= 10) {
    const boltScale = Math.max(tileSize * 0.22, 2.2);
    context.fillStyle = "#594400";
    context.beginPath();
    context.moveTo(centerX - boltScale * 0.2, centerY - boltScale * 1.15);
    context.lineTo(centerX + boltScale * 0.35, centerY - boltScale * 0.2);
    context.lineTo(centerX + boltScale * 0.03, centerY - boltScale * 0.2);
    context.lineTo(centerX + boltScale * 0.24, centerY + boltScale * 1.12);
    context.lineTo(centerX - boltScale * 0.36, centerY + boltScale * 0.1);
    context.lineTo(centerX - boltScale * 0.03, centerY + boltScale * 0.1);
    context.closePath();
    context.fill();
  }
}

/**
 * Draws a canvas stamp for a decoration tile.  Each type uses a distinct
 * shape so the map is readable even at small zoom levels.
 */
function drawDecorationStamp(
  context: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  decorationType: string,
  color: string,
) {
  const cx = px + tileSize / 2;
  const cy = py + tileSize / 2;
  const r = Math.max(tileSize / 3, 1.5);

  // ── Rectangle / block shapes ──────────────────────────────────────────
  if (
    decorationType === "hedge" ||
    decorationType === "sign" ||
    decorationType === "information-board" ||
    decorationType === "vending-machine"
  ) {
    const w = tileSize * 0.64;
    const h = tileSize * 0.64;
    context.fillStyle = color;
    context.fillRect(cx - w / 2, cy - h / 2, w, h);
    context.strokeStyle = "rgba(0,0,0,0.28)";
    context.lineWidth = Math.max(tileSize * 0.05, 0.8);
    context.strokeRect(cx - w / 2, cy - h / 2, w, h);
    return;
  }

  // ── Narrow upright rectangle ───────────────────────────────────────────
  if (
    decorationType === "mailbox" ||
    decorationType === "trash-bin" ||
    decorationType === "barrel" ||
    decorationType === "water-basin"
  ) {
    const w = tileSize * 0.44;
    const h = tileSize * 0.56;
    context.fillStyle = color;
    context.fillRect(cx - w / 2, cy - h / 2, w, h);
    context.strokeStyle = "rgba(0,0,0,0.22)";
    context.lineWidth = Math.max(tileSize * 0.04, 0.7);
    context.strokeRect(cx - w / 2, cy - h / 2, w, h);
    return;
  }

  // ── Campfire / torch: circle with a bright inner dot ──────────────────
  if (decorationType === "campfire" || decorationType === "torch") {
    context.fillStyle = color;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
    if (tileSize >= 8) {
      context.fillStyle = "#ffe0a0";
      context.beginPath();
      context.arc(cx, cy - r * 0.25, r * 0.38, 0, Math.PI * 2);
      context.fill();
    }
    return;
  }

  // ── Boulder: oversized circle with stroke ─────────────────────────────
  if (decorationType === "boulder") {
    context.fillStyle = color;
    context.beginPath();
    context.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(30,34,50,0.35)";
    context.lineWidth = Math.max(tileSize * 0.06, 1);
    context.beginPath();
    context.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    context.stroke();
    return;
  }

  // ── Tall-grass: thin vertical blades ─────────────────────────────────
  if (decorationType === "tall-grass") {
    const bladeW = Math.max(tileSize * 0.09, 1.2);
    context.fillStyle = color;
    for (let i = -1; i <= 1; i += 1) {
      const bx = cx + i * tileSize * 0.22;
      context.fillRect(bx - bladeW / 2, cy - r * 1.05, bladeW, r * 2.1);
    }
    return;
  }

  // ── Fountain: circle with a light-blue center drop ───────────────────
  if (decorationType === "fountain") {
    context.fillStyle = color;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
    if (tileSize >= 8) {
      context.fillStyle = "#d0f0ff";
      context.beginPath();
      context.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
      context.fill();
    }
    return;
  }

  // ── Weather-vane: small diamond ───────────────────────────────────────
  if (decorationType === "weather-vane") {
    const s = r * 0.9;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(cx, cy - s);
    context.lineTo(cx + s, cy);
    context.lineTo(cx, cy + s);
    context.lineTo(cx - s, cy);
    context.closePath();
    context.fill();
    return;
  }

  // ── Default: solid circle ─────────────────────────────────────────────
  context.fillStyle = color;
  context.beginPath();
  context.arc(cx, cy, r, 0, Math.PI * 2);
  context.fill();
}

function normalizeCustomSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatOptionLabel(option: string) {
  return option
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
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

function expandBrush(
  center: TilePoint,
  brushSize: number,
  width: number,
  height: number,
) {
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
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const dragActiveRef = useRef(false);
  const paintActiveRef = useRef(false);
  const [hoveredTile, setHoveredTile] = useState<TilePoint | null>(null);
  const [selectedTile, setSelectedTile] = useState<TilePoint | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>("brush");
  const [brushSize, setBrushSize] = useState(1);
  const [drawStart, setDrawStart] = useState<TilePoint | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [customRoadTypes, setCustomRoadTypes] = useState<string[]>([]);
  const [customRoadColors, setCustomRoadColors] = useState<
    Record<string, string>
  >({});
  const [customDecorationTypes, setCustomDecorationTypes] = useState<string[]>(
    [],
  );
  const [customDecorationColors, setCustomDecorationColors] = useState<
    Record<string, string>
  >({});
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
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
  const setSelectedBuildingId = useMapStore(
    (state) => state.setSelectedBuildingId,
  );
  const addCustomBuilding = useMapStore((state) => state.addCustomBuilding);
  const customBuildings = useMapStore((state) => state.customBuildings);
  const selectPlacement = useMapStore((state) => state.selectPlacement);
  const updateSelectedPlacementLabel = useMapStore(
    (state) => state.updateSelectedPlacementLabel,
  );
  const duplicateSelectedPlacement = useMapStore(
    (state) => state.duplicateSelectedPlacement,
  );
  const nudgeSelectedPlacement = useMapStore(
    (state) => state.nudgeSelectedPlacement,
  );
  const paintRoad = useMapStore((state) => state.paintRoad);
  const paintDecoration = useMapStore((state) => state.paintDecoration);
  const placeBuilding = useMapStore((state) => state.placeBuilding);
  const moveSelectedPlacement = useMapStore(
    (state) => state.moveSelectedPlacement,
  );
  const rotateSelectedPlacement = useMapStore(
    (state) => state.rotateSelectedPlacement,
  );
  const deleteSelectedPlacement = useMapStore(
    (state) => state.deleteSelectedPlacement,
  );
  const deleteAt = useMapStore((state) => state.deleteAt);
  const createNewMap = useMapStore((state) => state.createNewMap);
  const resetMap = useMapStore((state) => state.resetMap);
  const exportMap = useMapStore((state) => state.exportMap);
  const pushSnapshot = useMapStore((state) => state.pushSnapshot);
  const undo = useMapStore((state) => state.undo);
  const redo = useMapStore((state) => state.redo);
  const past = useMapStore((state) => state.past);
  const future = useMapStore((state) => state.future);
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const selectedPlacement =
    placements.find((placement) => placement.id === selectedPlacementId) ??
    null;
  const selectedTileRecord = selectedTile
    ? (tiles[tileKey(selectedTile.x, selectedTile.y)] ?? null)
    : null;
  const selectedTileForDisplay =
    selectedTile && selectedTileRecord ? selectedTile : null;
  const hasViewportSize = viewportSize.width > 0 && viewportSize.height > 0;
  const baseCanvasSize = hasViewportSize
    ? Math.min(viewportSize.width, viewportSize.height)
    : 720;
  const canvasDisplaySize = Math.max(320, Math.round(baseCanvasSize * mapZoom));
  const canvasShellWidth = hasViewportSize
    ? Math.max(viewportSize.width, canvasDisplaySize)
    : canvasDisplaySize;
  const canvasShellHeight = hasViewportSize
    ? Math.max(viewportSize.height, canvasDisplaySize)
    : canvasDisplaySize;
  const zoomPercent = Math.round(mapZoom * 100);
  const roadOptions = [...defaultRoadOptions, ...customRoadTypes];
  const decorationOptions = [
    ...defaultDecorationOptions,
    ...customDecorationTypes,
  ];
  const buildingOptions = [
    ...sampleBuildings,
    ...Object.values(customBuildings),
  ];

  function clearPlannerUiState() {
    setHoveredTile(null);
    setSelectedTile(null);
    setDrawStart(null);
    setSaveMessage(null);
  }

  function handleCreateNewMap() {
    createNewMap();
    clearPlannerUiState();
  }

  function handleResetMapTown() {
    const confirmed = window.confirm(
      "Reset map and town back to the starter layout? This clears current town edits.",
    );

    if (!confirmed) {
      return;
    }

    resetMap();
    setCustomRoadTypes([]);
    setCustomRoadColors({});
    setCustomDecorationTypes([]);
    setCustomDecorationColors({});
    clearPlannerUiState();
  }

  function handleCreateCustomAsset() {
    const assetTypeRaw = window.prompt(
      "Create custom asset type: road, decoration, item, or building",
      "road",
    );

    if (!assetTypeRaw) {
      return;
    }

    const assetType = assetTypeRaw.trim().toLowerCase();

    if (
      assetType !== "road" &&
      assetType !== "decoration" &&
      assetType !== "item" &&
      assetType !== "building"
    ) {
      window.alert("Use one of: road, decoration, item, building.");
      return;
    }

    const nameInput = window.prompt("Custom asset name", "My Custom Asset");

    if (!nameInput) {
      return;
    }

    const slug = normalizeCustomSlug(nameInput);

    if (!slug) {
      window.alert("Please enter a valid name.");
      return;
    }

    if (assetType === "road") {
      const color =
        window.prompt("Road color (hex)", "#9ca6bb")?.trim() || "#9ca6bb";
      setCustomRoadTypes((current) =>
        current.includes(slug) ? current : [...current, slug],
      );
      setCustomRoadColors((current) => ({ ...current, [slug]: color }));
      setRoadType(slug);
      setTool("road");
      return;
    }

    if (assetType === "decoration" || assetType === "item") {
      const key = assetType === "item" ? `item-${slug}` : slug;
      const color =
        window.prompt("Decoration color (hex)", "#74b48f")?.trim() || "#74b48f";
      setCustomDecorationTypes((current) =>
        current.includes(key) ? current : [...current, key],
      );
      setCustomDecorationColors((current) => ({ ...current, [key]: color }));
      setDecorationType(key);
      setTool("decoration");
      return;
    }

    const widthInput = window.prompt("Building footprint width", "4");
    const depthInput = window.prompt("Building footprint depth", "4");

    if (!widthInput || !depthInput) {
      return;
    }

    const widthValue = Number(widthInput);
    const depthValue = Number(depthInput);

    if (!Number.isFinite(widthValue) || !Number.isFinite(depthValue)) {
      window.alert("Width and depth must be numbers.");
      return;
    }

    const customId = addCustomBuilding({
      name: nameInput,
      width: widthValue,
      depth: depthValue,
      theme: "custom",
    });
    setSelectedBuildingId(customId);
    setTool("building");
  }

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

  function activateTool(nextTool: MapTool) {
    setTool(nextTool);

    if (
      nextTool === "building" ||
      nextTool === "hand" ||
      nextTool === "eyedropper"
    ) {
      setDrawStart(null);
    }
  }

  function activateDrawMode(nextMode: DrawMode) {
    setDrawMode(nextMode);
  }

  function applyDrawTiles(points: TilePoint[]) {
    const expanded =
      drawMode === "brush"
        ? uniqueTiles(
            points.flatMap((point) =>
              expandBrush(point, brushSize, width, height),
            ),
          )
        : uniqueTiles(points);

    expanded.forEach(applyTileOperation);
  }

  function floodFillFrom(tile: TilePoint) {
    const originPlacement = findPlacementAtTile(
      placements,
      tile.x,
      tile.y,
      customBuildings,
    );

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

      if (
        findPlacementAtTile(placements, current.x, current.y, customBuildings)
      ) {
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
    const placement = findPlacementAtTile(
      placements,
      tile.x,
      tile.y,
      customBuildings,
    );

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

    const electricPoles: TilePoint[] = [];

    Object.values(tiles).forEach((tile) => {
      const px = offsetX + tile.x * tileSize;
      const py = offsetY + tile.y * tileSize;

      if (tile.tileType === "road" && tile.roadType) {
        context.fillStyle =
          customRoadColors[tile.roadType] ??
          roadColors[tile.roadType] ??
          "#8f9ab1";
        context.fillRect(px, py, tileSize, tileSize);
      }

      if (tile.tileType === "decoration" && tile.decorationType) {
        if (tile.decorationType === "electric-pole") {
          electricPoles.push({ x: tile.x, y: tile.y });
          drawElectricPoleStamp(context, px, py, tileSize);
        } else {
          const decoColor =
            customDecorationColors[tile.decorationType] ??
            decorationColors[tile.decorationType] ??
            "#74b48f";
          drawDecorationStamp(
            context,
            px,
            py,
            tileSize,
            tile.decorationType,
            decoColor,
          );
        }
      }
    });

    if (electricPoles.length > 1) {
      const links = getPoleConnections(electricPoles, 15);
      context.strokeStyle = "rgba(255, 219, 71, 0.72)";
      context.lineWidth = Math.max(tileSize * 0.12, 1.35);

      links.forEach((link) => {
        context.beginPath();
        context.moveTo(
          offsetX + (link.from.x + 0.5) * tileSize,
          offsetY + (link.from.y + 0.5) * tileSize,
        );
        context.lineTo(
          offsetX + (link.to.x + 0.5) * tileSize,
          offsetY + (link.to.y + 0.5) * tileSize,
        );
        context.stroke();
      });
    }

    placements.forEach((placement) => {
      const building =
        sampleBuildingLookup[placement.buildingId] ??
        customBuildings[placement.buildingId];

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
        placement.id === selectedPlacementId
          ? "#ff9d45"
          : "rgba(219, 231, 255, 0.4)";
      context.strokeRect(px, py, boxWidth, boxHeight);

      if (tileSize > 8) {
        const labelX = px + 4;
        const labelY = py + Math.min(boxHeight / 2, 16);
        const maxLabelWidth = Math.max(boxWidth - 8, 24);

        context.fillStyle = "#ffffff";
        context.font = "600 10px 'IBM Plex Mono', monospace";
        context.lineWidth = 3;
        context.strokeStyle = "rgba(9, 17, 31, 0.9)";
        context.strokeText(placement.label, labelX, labelY, maxLabelWidth);
        context.fillText(placement.label, labelX, labelY, maxLabelWidth);
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

    for (let index = 0; index <= width; index += 1) {
      if (index % 10 === 0 || index === width) {
        continue;
      }

      const position = offsetX + index * tileSize;
      context.strokeStyle = "rgba(171, 193, 228, 0.12)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(position, offsetY);
      context.lineTo(position, offsetY + mapSize);
      context.stroke();
    }

    for (let index = 0; index <= height; index += 1) {
      if (index % 10 === 0 || index === height) {
        continue;
      }

      const position = offsetY + index * tileSize;
      context.strokeStyle = "rgba(171, 193, 228, 0.12)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(offsetX, position);
      context.lineTo(offsetX + mapSize, position);
      context.stroke();
    }

    for (let index = 0; index <= width; index += 10) {
      const position = offsetX + index * tileSize;
      context.strokeStyle = "rgba(218, 232, 255, 0.28)";
      context.lineWidth = 1.9;
      context.beginPath();
      context.moveTo(position, offsetY);
      context.lineTo(position, offsetY + mapSize);
      context.stroke();
    }

    for (let index = 0; index <= height; index += 10) {
      const position = offsetY + index * tileSize;
      context.strokeStyle = "rgba(218, 232, 255, 0.28)";
      context.lineWidth = 1.9;
      context.beginPath();
      context.moveTo(offsetX, position);
      context.lineTo(offsetX + mapSize, position);
      context.stroke();
    }

    context.strokeStyle = "rgba(236, 244, 255, 0.34)";
    context.lineWidth = 2.2;
    context.strokeRect(offsetX, offsetY, mapSize, mapSize);

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
    const viewport = canvasViewportRef.current;

    if (!viewport) {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    };

    updateViewportSize();
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        if (event.key.toLowerCase() === "z" && !event.shiftKey) {
          event.preventDefault();
          undo();
          return;
        }

        if (
          event.key.toLowerCase() === "y" ||
          (event.key.toLowerCase() === "z" && event.shiftKey)
        ) {
          event.preventDefault();
          redo();
          return;
        }

        return;
      }

      if (event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const nextTool = toolShortcutLookup[key];

      if (nextTool) {
        event.preventDefault();
        setTool(nextTool);

        if (
          nextTool === "building" ||
          nextTool === "hand" ||
          nextTool === "eyedropper"
        ) {
          setDrawStart(null);
        }

        return;
      }

      const nextDrawMode = drawModeShortcutLookup[key];

      if (!nextDrawMode) {
        return;
      }

      event.preventDefault();
      setDrawMode(nextDrawMode);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setDrawMode, setDrawStart, setTool, undo, redo]);

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
    mapZoom,
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
    const placement = findPlacementAtTile(
      placements,
      tile.x,
      tile.y,
      customBuildings,
    );

    if (placement) {
      selectPlacement(placement.id);
      setSelectedTile(null);
      pushSnapshot();
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
      pushSnapshot();
      placeBuilding(tile.x, tile.y);
      return;
    }

    if (tool === "road" || tool === "decoration" || tool === "delete") {
      setSelectedTile(null);

      if (drawMode === "fill") {
        pushSnapshot();
        floodFillFrom(tile);
        return;
      }

      if (drawMode === "brush") {
        pushSnapshot();
        applyDrawTiles([tile]);
        paintActiveRef.current = true;
        return;
      }

      setDrawStart(tile);
    }
  }

  async function handleSaveMap() {
    try {
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
    } catch {
      setSaveMessage("Save failed — check your connection and try again.");
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <SectionCard
        title="2D Town Planner"
        description="Design your town on a 100×100 grid. Place roads, decorations, and buildings — then save your map or generate a materials list."
        className="flex min-h-[calc(100vh-11rem)] flex-col"
      >
        <div className="mb-4 space-y-2 rounded-[24px] bg-[color:var(--surface)] px-4 py-4 text-sm text-[color:var(--muted)]">
          <p className="font-semibold text-[color:var(--foreground)]">
            Quick Start — Tools &amp; Shortcuts
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span>
              <strong className="text-[color:var(--foreground)]">H</strong> —
              Hand: click a building to select it, then drag to move it.
            </span>
            <span>
              <strong className="text-[color:var(--foreground)]">R</strong> —
              Road: paint road tiles onto the grid.
            </span>
            <span>
              <strong className="text-[color:var(--foreground)]">B</strong> —
              Building: stamp the chosen blueprint.
            </span>
            <span>
              <strong className="text-[color:var(--foreground)]">D</strong> —
              Decoration: place trees, lamps, electric poles and more.
            </span>
            <span>
              <strong className="text-[color:var(--foreground)]">E</strong> —
              Eyedropper: click any tile or building to sample its type.
            </span>
            <span>
              <strong className="text-[color:var(--foreground)]">X</strong> —
              Delete: click or drag to erase tiles and remove buildings.
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-[color:var(--line)] pt-2">
            <span>
              Draw modes:{" "}
              <strong className="text-[color:var(--foreground)]">1</strong>{" "}
              Brush ·{" "}
              <strong className="text-[color:var(--foreground)]">2</strong> Line
              · <strong className="text-[color:var(--foreground)]">3</strong>{" "}
              Rectangle ·{" "}
              <strong className="text-[color:var(--foreground)]">4</strong> Fill
            </span>
            <span>
              Undo:{" "}
              <strong className="text-[color:var(--foreground)]">Ctrl+Z</strong>{" "}
              · Redo:{" "}
              <strong className="text-[color:var(--foreground)]">Ctrl+Y</strong>{" "}
              (or Ctrl+Shift+Z) · Bold grid lines = every 10 tiles.
            </span>
          </div>
        </div>
        <div className="grid min-h-[720px] flex-1 grid-cols-[minmax(0,1fr)_78px] gap-4">
          <div
            ref={canvasViewportRef}
            className="overflow-auto rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface-strong)]"
          >
            <div
              className="flex items-start justify-center"
              style={{
                width: `${canvasShellWidth}px`,
                height: `${canvasShellHeight}px`,
                minWidth: "100%",
                minHeight: "100%",
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  width: `${canvasDisplaySize}px`,
                  height: `${canvasDisplaySize}px`,
                }}
                className={`block touch-none ${
                  tool === "hand"
                    ? "cursor-grab"
                    : tool === "eyedropper"
                      ? "cursor-copy"
                      : "cursor-crosshair"
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
                    (tool === "road" ||
                      tool === "decoration" ||
                      tool === "delete") &&
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
                    (tool === "road" ||
                      tool === "decoration" ||
                      tool === "delete")
                  ) {
                    if (drawMode === "line") {
                      pushSnapshot();
                      applyDrawTiles(getLineTiles(drawStart, tile));
                    }

                    if (drawMode === "rectangle") {
                      pushSnapshot();
                      applyDrawTiles(getRectangleTiles(drawStart, tile));
                    }
                  }

                  dragActiveRef.current = false;
                  paintActiveRef.current = false;
                  setDrawStart(null);
                }}
              />
            </div>
          </div>
          <div className="flex h-[16.8em] flex-col items-center gap-4 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-2)]">
              Zoom
            </p>
            <div className="rounded-full bg-[color:var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]">
              {zoomPercent}%
            </div>
            <div className="pt-10">
              <input
                type="range"
                min={0.6}
                max={2}
                step={0.1}
                value={mapZoom}
                onChange={(event) => setMapZoom(Number(event.target.value))}
                className="h-[auto] w-[auto]  -rotate-90 accent-[color:var(--accent)]"
                aria-label="Map zoom"
              />
            </div>
            <button
              type="button"
              onClick={() => setMapZoom(1)}
              className="mt-10 rounded-2xl bg-[color:var(--surface-strong)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]"
            >
              Reset
            </button>
          </div>
        </div>
      </SectionCard>
      <div className="space-y-5 xl:sticky xl:top-28 xl:self-start">
        <SectionCard
          title="Planner Controls"
          description="Choose the active tool, switch drawing modes, and tune the stamp behavior. Keyboard shortcuts mirror the main planner controls."
        >
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">
                Town name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {plannerToolDefinitions.map((option) => (
                <button
                  key={option.tool}
                  type="button"
                  onClick={() => activateTool(option.tool)}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                    tool === option.tool
                      ? "border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 text-[color:var(--foreground)]"
                      : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="rounded-full bg-black/20 px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    {option.shortcut}
                  </span>
                </button>
              ))}
            </div>
            {tool === "road" || tool === "decoration" || tool === "delete" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {drawModeDefinitions.map((modeOption) => (
                    <button
                      key={modeOption.mode}
                      type="button"
                      onClick={() => activateDrawMode(modeOption.mode)}
                      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                        drawMode === modeOption.mode
                          ? "bg-[color:var(--accent)]/20 text-[color:var(--foreground)]"
                          : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
                      }`}
                    >
                      <span>{modeOption.label}</span>
                      <span className="rounded-full bg-black/20 px-2 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        {modeOption.shortcut}
                      </span>
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
                      onChange={(event) =>
                        setBrushSize(Number(event.target.value))
                      }
                      className="w-full accent-[color:var(--accent)]"
                    />
                  </div>
                ) : null}
              </>
            ) : null}
            {tool === "road" ? (
              <div className="grid grid-cols-2 gap-3">
                {roadOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRoadType(option)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                      roadType === option
                        ? "bg-[color:var(--accent)]/18 text-[color:var(--foreground)]"
                        : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
                    }`}
                  >
                    {formatOptionLabel(option)}
                  </button>
                ))}
              </div>
            ) : null}
            {tool === "decoration" ? (
              <div className="grid grid-cols-3 gap-3">
                {decorationOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDecorationType(option)}
                    className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold ${
                      decorationType === option
                        ? "bg-[color:var(--accent-2)]/18 text-[color:var(--foreground)]"
                        : "bg-[color:var(--surface)] text-[color:var(--foreground)]"
                    }`}
                  >
                    {formatOptionLabel(option)}
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
                  onChange={(event) =>
                    setSelectedBuildingId(event.target.value)
                  }
                  className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
                >
                  {buildingOptions.map((building) => (
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
                onClick={() => undo()}
                disabled={!canUndo}
                className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] disabled:opacity-35"
                title="Undo (Ctrl+Z)"
              >
                ↩ Undo
              </button>
              <button
                type="button"
                onClick={() => redo()}
                disabled={!canRedo}
                className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] disabled:opacity-35"
                title="Redo (Ctrl+Y)"
              >
                ↪ Redo
              </button>
              <button
                type="button"
                onClick={handleCreateCustomAsset}
                className="col-span-2 rounded-2xl border border-[color:var(--foreground)]/20 bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
              >
                + New Custom Asset
              </button>
              <button
                type="button"
                onClick={handleCreateNewMap}
                className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
              >
                New Town
              </button>
              <button
                type="button"
                onClick={handleResetMapTown}
                className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
              >
                Reset Map + Town
              </button>
              <button
                type="button"
                onClick={handleSaveMap}
                className="col-span-2 rounded-2xl border border-[color:var(--foreground)]/40 bg-[color:var(--accent)]/16 px-4 py-3 text-sm font-semibold text-[color:var(--foreground)]"
              >
                Save map
              </button>
            </div>
            {saveMessage ? (
              <p className="text-sm leading-6 text-[color:var(--muted)]">
                {saveMessage}
              </p>
            ) : null}
          </div>
        </SectionCard>
        <SectionCard
          title="Selection Editor"
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
                  Position {selectedPlacement.x}, {selectedPlacement.y} with
                  rotation {selectedPlacement.rotation} degrees.
                </p>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[color:var(--muted)]">
                  Label
                </span>
                <input
                  value={selectedPlacement.label}
                  onChange={(event) =>
                    updateSelectedPlacementLabel(event.target.value)
                  }
                  className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm outline-none"
                />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    pushSnapshot();
                    nudgeSelectedPlacement(0, -1);
                  }}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pushSnapshot();
                    rotateSelectedPlacement();
                  }}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Rotate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pushSnapshot();
                    nudgeSelectedPlacement(0, 1);
                  }}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pushSnapshot();
                    nudgeSelectedPlacement(-1, 0);
                  }}
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
                  onClick={() => {
                    pushSnapshot();
                    nudgeSelectedPlacement(1, 0);
                  }}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Right
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    pushSnapshot();
                    duplicateSelectedPlacement();
                  }}
                  className="rounded-2xl bg-[color:var(--surface-strong)] px-4 py-3 text-sm font-semibold"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pushSnapshot();
                    deleteSelectedPlacement();
                  }}
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
                  {roadOptions.map((option) => (
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
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                        selectedTileRecord.roadType === option
                          ? "bg-[color:var(--accent)]/18"
                          : "bg-[color:var(--surface-strong)]"
                      }`}
                    >
                      {formatOptionLabel(option)}
                    </button>
                  ))}
                </div>
              ) : null}
              {selectedTileRecord.tileType === "decoration" ? (
                <div className="grid grid-cols-3 gap-3">
                  {decorationOptions.map((option) => (
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
                      className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold ${
                        selectedTileRecord.decorationType === option
                          ? "bg-[color:var(--accent-2)]/18"
                          : "bg-[color:var(--surface-strong)]"
                      }`}
                    >
                      {formatOptionLabel(option)}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (selectedTile) {
                    pushSnapshot();
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
              Nothing selected yet. Use the hand tool or eyedropper to inspect
              what is already on the map.
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
