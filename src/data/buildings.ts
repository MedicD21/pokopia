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
      (left, right) => left.y - right.y || left.z - right.z || left.x - right.x,
    ),
  };
}

export const sampleBuildings: BuildingData[] = [];

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
