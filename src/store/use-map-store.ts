"use client";

import { create } from "zustand";

import { getRotatedFootprint, sampleBuildingLookup } from "@/data/buildings";
import { starterTownMap } from "@/data/map-template";
import type { BuildingPlacement, GridTile, TownMap } from "@/lib/types";

export type MapTool =
  | "hand"
  | "road"
  | "building"
  | "decoration"
  | "eyedropper"
  | "delete";

interface MapPlannerState {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: Record<string, GridTile>;
  placements: BuildingPlacement[];
  tool: MapTool;
  roadType: NonNullable<GridTile["roadType"]>;
  decorationType: string;
  selectedBuildingId: string;
  selectedPlacementId: string | null;
  setName: (name: string) => void;
  setTool: (tool: MapTool) => void;
  setRoadType: (roadType: NonNullable<GridTile["roadType"]>) => void;
  setDecorationType: (decorationType: string) => void;
  setSelectedBuildingId: (buildingId: string) => void;
  selectPlacement: (placementId: string | null) => void;
  updateSelectedPlacementLabel: (label: string) => void;
  duplicateSelectedPlacement: () => void;
  nudgeSelectedPlacement: (dx: number, dy: number) => void;
  paintRoad: (x: number, y: number) => void;
  paintDecoration: (x: number, y: number) => void;
  placeBuilding: (x: number, y: number) => void;
  moveSelectedPlacement: (x: number, y: number) => void;
  rotateSelectedPlacement: () => void;
  deleteSelectedPlacement: () => void;
  deleteAt: (x: number, y: number) => void;
  resetMap: () => void;
  exportMap: () => TownMap;
}

function tileKey(x: number, y: number) {
  return `${x}:${y}`;
}

function tilesToRecord(tiles: GridTile[]) {
  return tiles.reduce<Record<string, GridTile>>((record, tile) => {
    record[tileKey(tile.x, tile.y)] = tile;
    return record;
  }, {});
}

function serializeTiles(tiles: Record<string, GridTile>) {
  return Object.values(tiles).sort((left, right) => left.y - right.y || left.x - right.x);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function findPlacementAtTile(
  placements: BuildingPlacement[],
  x: number,
  y: number,
) {
  const orderedPlacements = [...placements].reverse();

  for (const placement of orderedPlacements) {
    const building = sampleBuildingLookup[placement.buildingId];

    if (!building) {
      continue;
    }

    const footprint = getRotatedFootprint(building, placement.rotation);
    const withinX = x >= placement.x && x < placement.x + footprint.width;
    const withinY = y >= placement.y && y < placement.y + footprint.depth;

    if (withinX && withinY) {
      return placement;
    }
  }

  return null;
}

function createStarterState() {
  return {
    id: starterTownMap.id,
    name: starterTownMap.name,
    width: starterTownMap.width,
    height: starterTownMap.height,
    tiles: tilesToRecord(starterTownMap.tiles),
    placements: starterTownMap.placements,
    tool: "hand" as MapTool,
    roadType: "stone" as NonNullable<GridTile["roadType"]>,
    decorationType: "tree",
    selectedBuildingId: starterTownMap.placements[0]?.buildingId ?? "pokecenter",
    selectedPlacementId: starterTownMap.placements[0]?.id ?? null,
  };
}

export const useMapStore = create<MapPlannerState>((set, get) => ({
  ...createStarterState(),
  setName: (name) => set({ name }),
  setTool: (tool) => set({ tool }),
  setRoadType: (roadType) => set({ roadType }),
  setDecorationType: (decorationType) => set({ decorationType }),
  setSelectedBuildingId: (selectedBuildingId) => set({ selectedBuildingId }),
  selectPlacement: (selectedPlacementId) => set({ selectedPlacementId }),
  updateSelectedPlacementLabel: (label) => {
    const { placements, selectedPlacementId } = get();

    if (!selectedPlacementId) {
      return;
    }

    set({
      placements: placements.map((entry) =>
        entry.id === selectedPlacementId
          ? {
              ...entry,
              label,
            }
          : entry,
      ),
    });
  },
  duplicateSelectedPlacement: () => {
    const { placements, selectedPlacementId, width, height } = get();

    if (!selectedPlacementId) {
      return;
    }

    const placement = placements.find((entry) => entry.id === selectedPlacementId);

    if (!placement) {
      return;
    }

    const building = sampleBuildingLookup[placement.buildingId];

    if (!building) {
      return;
    }

    const footprint = getRotatedFootprint(building, placement.rotation);
    const nextPlacement: BuildingPlacement = {
      ...placement,
      id: crypto.randomUUID(),
      x: clamp(placement.x + footprint.width + 1, 0, width - footprint.width),
      y: clamp(placement.y + 1, 0, height - footprint.depth),
      label: `${placement.label} Copy`,
    };

    set({
      placements: [...placements, nextPlacement],
      selectedPlacementId: nextPlacement.id,
      selectedBuildingId: nextPlacement.buildingId,
    });
  },
  nudgeSelectedPlacement: (dx, dy) => {
    const { placements, selectedPlacementId, width, height } = get();

    if (!selectedPlacementId) {
      return;
    }

    const placement = placements.find((entry) => entry.id === selectedPlacementId);

    if (!placement) {
      return;
    }

    const building = sampleBuildingLookup[placement.buildingId];

    if (!building) {
      return;
    }

    const footprint = getRotatedFootprint(building, placement.rotation);

    set({
      placements: placements.map((entry) =>
        entry.id === selectedPlacementId
          ? {
              ...entry,
              x: clamp(entry.x + dx, 0, width - footprint.width),
              y: clamp(entry.y + dy, 0, height - footprint.depth),
            }
          : entry,
      ),
    });
  },
  paintRoad: (x, y) => {
    const { roadType, tiles } = get();
    const key = tileKey(x, y);

    set({
      tiles: {
        ...tiles,
        [key]: {
          x,
          y,
          tileType: "road",
          roadType,
        },
      },
    });
  },
  paintDecoration: (x, y) => {
    const { decorationType, tiles } = get();
    const key = tileKey(x, y);

    set({
      tiles: {
        ...tiles,
        [key]: {
          x,
          y,
          tileType: "decoration",
          decorationType,
        },
      },
    });
  },
  placeBuilding: (x, y) => {
    const { selectedBuildingId, placements, width, height } = get();
    const building = sampleBuildingLookup[selectedBuildingId];

    if (!building) {
      return;
    }

    const clampedX = clamp(x, 0, width - building.footprint.width);
    const clampedY = clamp(y, 0, height - building.footprint.depth);
    const placement: BuildingPlacement = {
      id: crypto.randomUUID(),
      buildingId: selectedBuildingId,
      x: clampedX,
      y: clampedY,
      rotation: 0,
      label: building.name,
    };

    set({
      placements: [...placements, placement],
      selectedPlacementId: placement.id,
    });
  },
  moveSelectedPlacement: (x, y) => {
    const { placements, selectedPlacementId, width, height } = get();

    if (!selectedPlacementId) {
      return;
    }

    const placement = placements.find((entry) => entry.id === selectedPlacementId);

    if (!placement) {
      return;
    }

    const building = sampleBuildingLookup[placement.buildingId];

    if (!building) {
      return;
    }

    const footprint = getRotatedFootprint(building, placement.rotation);
    const clampedX = clamp(x, 0, width - footprint.width);
    const clampedY = clamp(y, 0, height - footprint.depth);

    set({
      placements: placements.map((entry) =>
        entry.id === selectedPlacementId
          ? {
              ...entry,
              x: clampedX,
              y: clampedY,
            }
          : entry,
      ),
    });
  },
  rotateSelectedPlacement: () => {
    const { placements, selectedPlacementId, width, height } = get();

    if (!selectedPlacementId) {
      return;
    }

    set({
      placements: placements.map((entry) => {
        if (entry.id !== selectedPlacementId) {
          return entry;
        }

        const nextRotation =
          entry.rotation === 270 ? 0 : ((entry.rotation + 90) as typeof entry.rotation);
        const building = sampleBuildingLookup[entry.buildingId];

        if (!building) {
          return entry;
        }

        const nextFootprint = getRotatedFootprint(building, nextRotation);

        return {
          ...entry,
          rotation: nextRotation,
          x: clamp(entry.x, 0, width - nextFootprint.width),
          y: clamp(entry.y, 0, height - nextFootprint.depth),
        };
      }),
    });
  },
  deleteSelectedPlacement: () => {
    const { placements, selectedPlacementId } = get();

    if (!selectedPlacementId) {
      return;
    }

    set({
      placements: placements.filter((entry) => entry.id !== selectedPlacementId),
      selectedPlacementId: null,
    });
  },
  deleteAt: (x, y) => {
    const { placements, tiles } = get();
    const placement = findPlacementAtTile(placements, x, y);

    if (placement) {
      set({
        placements: placements.filter((entry) => entry.id !== placement.id),
        selectedPlacementId: null,
      });
      return;
    }

    const nextTiles = { ...tiles };
    delete nextTiles[tileKey(x, y)];
    set({ tiles: nextTiles });
  },
  resetMap: () => set(createStarterState()),
  exportMap: () => {
    const { height, id, name, placements, tiles, width } = get();

    return {
      id,
      name,
      width,
      height,
      placements,
      tiles: serializeTiles(tiles),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
}));
