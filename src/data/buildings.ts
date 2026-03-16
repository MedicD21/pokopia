import { blockMaterialLookup } from "@/data/materials";
import type {
  BlockMaterialId,
  BuildingData,
  BuildingFootprint,
  Rotation,
  VoxelBlock,
} from "@/lib/types";

function createBlock(
  x: number,
  y: number,
  z: number,
  material: BlockMaterialId,
  tags: string[] = [],
): VoxelBlock {
  return {
    id: `${x}:${y}:${z}`,
    x,
    y,
    z,
    material,
    color: blockMaterialLookup[material].color,
    tags,
  };
}

function addBlock(
  blocks: Map<string, VoxelBlock>,
  x: number,
  y: number,
  z: number,
  material: BlockMaterialId,
  tags: string[] = [],
) {
  blocks.set(`${x}:${y}:${z}`, createBlock(x, y, z, material, tags));
}

function fillVolume(
  blocks: Map<string, VoxelBlock>,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  material: BlockMaterialId,
  tags: string[] = [],
) {
  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      for (let z = z0; z <= z1; z += 1) {
        addBlock(blocks, x, y, z, material, tags);
      }
    }
  }
}

function perimeterWalls(
  blocks: Map<string, VoxelBlock>,
  footprint: BuildingFootprint,
  y0: number,
  y1: number,
  material: BlockMaterialId,
  tags: string[] = [],
  skip?: (x: number, y: number, z: number) => boolean,
) {
  for (let x = 0; x < footprint.width; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      for (let z = 0; z < footprint.depth; z += 1) {
        const edge =
          x === 0 ||
          z === 0 ||
          x === footprint.width - 1 ||
          z === footprint.depth - 1;

        if (!edge) {
          continue;
        }

        if (skip?.(x, y, z)) {
          continue;
        }

        addBlock(blocks, x, y, z, material, tags);
      }
    }
  }
}

function finishBuilding(
  data: Omit<BuildingData, "blocks">,
  blocks: Map<string, VoxelBlock>,
): BuildingData {
  return {
    ...data,
    blocks: [...blocks.values()].sort(
      (left, right) =>
        left.y - right.y || left.z - right.z || left.x - right.x,
    ),
  };
}

function buildPokecenter(): BuildingData {
  const footprint = { width: 8, depth: 8, height: 6 };
  const blocks = new Map<string, VoxelBlock>();

  fillVolume(blocks, 0, 7, 0, 0, 0, 7, "stone", ["foundation"]);
  perimeterWalls(
    blocks,
    footprint,
    1,
    3,
    "brick",
    ["wall"],
    (x, y, z) => z === 0 && x >= 3 && x <= 4 && y <= 2,
  );
  fillVolume(blocks, 2, 5, 1, 2, 0, 0, "glass", ["front-window"]);
  fillVolume(blocks, 0, 0, 2, 2, 2, 5, "glass", ["side-window"]);
  fillVolume(blocks, 7, 7, 2, 2, 2, 5, "glass", ["side-window"]);
  fillVolume(blocks, 0, 7, 4, 4, 0, 7, "roof", ["roof"]);
  fillVolume(blocks, 1, 6, 5, 5, 1, 6, "roof", ["roof"]);
  fillVolume(blocks, 3, 4, 1, 1, 0, 0, "decor", ["entry-light"]);
  fillVolume(blocks, 3, 4, 3, 3, 7, 7, "decor", ["rear-sign"]);

  return finishBuilding(
    {
      id: "pokecenter",
      name: "Aurora Care Center",
      description: "A bright healing hub with a civic brick shell and bold red roof.",
      theme: "community",
      footprint,
      tags: ["healing", "community", "service"],
      suggestedSkills: ["heavy lifting", "precision work", "electric power"],
    },
    blocks,
  );
}

function buildHarborWorkshop(): BuildingData {
  const footprint = { width: 10, depth: 7, height: 6 };
  const blocks = new Map<string, VoxelBlock>();

  fillVolume(blocks, 0, 9, 0, 0, 0, 6, "stone", ["foundation"]);
  perimeterWalls(
    blocks,
    footprint,
    1,
    3,
    "wood",
    ["wall"],
    (x, y, z) => z === 0 && x >= 4 && x <= 5 && y <= 2,
  );
  fillVolume(blocks, 1, 8, 4, 4, 0, 6, "metal", ["beam-cap"]);
  fillVolume(blocks, 0, 9, 5, 5, 0, 6, "roof", ["roof"]);
  fillVolume(blocks, 2, 7, 2, 2, 6, 6, "glass", ["rear-window"]);
  fillVolume(blocks, 0, 0, 2, 2, 2, 4, "glass", ["port-window"]);
  fillVolume(blocks, 9, 9, 2, 2, 2, 4, "glass", ["port-window"]);
  fillVolume(blocks, 1, 8, 1, 1, 1, 1, "decor", ["workbench"]);
  fillVolume(blocks, 8, 8, 1, 3, 1, 1, "metal", ["crane-post"]);

  return finishBuilding(
    {
      id: "harbor-workshop",
      name: "Harbor Forge Workshop",
      description: "A mixed-material workshop built for tools, shipping, and repairs.",
      theme: "industrial",
      footprint,
      tags: ["industry", "forge", "shipping"],
      suggestedSkills: ["fire forging", "transport", "heavy lifting"],
    },
    blocks,
  );
}

function buildGreenhouse(): BuildingData {
  const footprint = { width: 9, depth: 7, height: 6 };
  const blocks = new Map<string, VoxelBlock>();

  fillVolume(blocks, 0, 8, 0, 0, 0, 6, "stone", ["foundation"]);
  perimeterWalls(blocks, footprint, 1, 3, "glass", ["wall"]);
  for (let x = 0; x < footprint.width; x += 1) {
    for (let z = 0; z < footprint.depth; z += 1) {
      const frameCell =
        x === 0 ||
        z === 0 ||
        x === footprint.width - 1 ||
        z === footprint.depth - 1 ||
        x === Math.floor(footprint.width / 2);

      if (frameCell) {
        addBlock(blocks, x, 4, z, "metal", ["frame"]);
      } else {
        addBlock(blocks, x, 4, z, "glass", ["roof"]);
      }
    }
  }
  fillVolume(blocks, 4, 4, 1, 3, 0, 0, "decor", ["entry-arch"]);
  fillVolume(blocks, 2, 6, 1, 1, 3, 3, "wood", ["planter-bench"]);

  return finishBuilding(
    {
      id: "glass-greenhouse",
      name: "Glassleaf Conservatory",
      description: "A light-filled greenhouse for botanical builds and scenic parks.",
      theme: "garden",
      footprint,
      tags: ["nature", "research", "park"],
      suggestedSkills: ["precision work", "water shaping", "transport"],
    },
    blocks,
  );
}

export const sampleBuildings = [
  buildPokecenter(),
  buildHarborWorkshop(),
  buildGreenhouse(),
];

export const sampleBuildingLookup = sampleBuildings.reduce<
  Record<string, BuildingData>
>((lookup, building) => {
  lookup[building.id] = building;
  return lookup;
}, {});

export function cloneBuildingData(building: BuildingData): BuildingData {
  return {
    ...building,
    footprint: { ...building.footprint },
    tags: [...building.tags],
    suggestedSkills: [...building.suggestedSkills],
    blocks: building.blocks.map((block) => ({
      ...block,
      tags: [...block.tags],
    })),
  };
}

export function getRotatedFootprint(
  building: BuildingData,
  rotation: Rotation,
): BuildingFootprint {
  if (rotation === 90 || rotation === 270) {
    return {
      width: building.footprint.depth,
      depth: building.footprint.width,
      height: building.footprint.height,
    };
  }

  return { ...building.footprint };
}
