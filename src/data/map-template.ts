import { sampleBuildings } from "@/data/buildings";
import type { BuildingPlacement, GridTile, TownMap } from "@/lib/types";

function makeRoadRow(y: number, x0: number, x1: number, roadType: GridTile["roadType"]) {
  const tiles: GridTile[] = [];

  for (let x = x0; x <= x1; x += 1) {
    tiles.push({ x, y, tileType: "road", roadType });
  }

  return tiles;
}

function makeRoadColumn(
  x: number,
  y0: number,
  y1: number,
  roadType: GridTile["roadType"],
) {
  const tiles: GridTile[] = [];

  for (let y = y0; y <= y1; y += 1) {
    tiles.push({ x, y, tileType: "road", roadType });
  }

  return tiles;
}

const placements: BuildingPlacement[] = [
  {
    id: "starter-care-center",
    buildingId: sampleBuildings[0].id,
    x: 12,
    y: 10,
    rotation: 0,
    label: sampleBuildings[0].name,
  },
  {
    id: "starter-workshop",
    buildingId: sampleBuildings[1].id,
    x: 40,
    y: 12,
    rotation: 90,
    label: sampleBuildings[1].name,
  },
  {
    id: "starter-greenhouse",
    buildingId: sampleBuildings[2].id,
    x: 68,
    y: 26,
    rotation: 0,
    label: sampleBuildings[2].name,
  },
];

export const starterTownMap: TownMap = {
  id: "starter-map",
  name: "Sunrise Borough",
  width: 100,
  height: 100,
  tiles: [
    ...makeRoadRow(20, 4, 92, "stone"),
    ...makeRoadRow(45, 8, 84, "path"),
    ...makeRoadColumn(20, 5, 86, "stone"),
    ...makeRoadColumn(52, 10, 70, "bridge"),
    { x: 17, y: 17, tileType: "decoration", decorationType: "tree" },
    { x: 18, y: 17, tileType: "decoration", decorationType: "lamp" },
    { x: 54, y: 43, tileType: "decoration", decorationType: "flower" },
    { x: 73, y: 28, tileType: "decoration", decorationType: "tree" },
  ],
  placements,
  createdAt: new Date("2026-03-16T09:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-03-16T09:00:00.000Z").toISOString(),
};
