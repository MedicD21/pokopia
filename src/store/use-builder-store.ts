"use client";

import { create } from "zustand";

import {
  cloneBuildingData,
  sampleBuildings,
  sampleBuildingLookup,
} from "@/data/buildings";
import { blockMaterialLookup } from "@/data/materials";
import { deriveFootprintFromBlocks } from "@/lib/materials";
import type { BlockMaterialId, BuildingData, VoxelBlock } from "@/lib/types";

export type BuilderMode =
  | "hand"
  | "add"
  | "remove"
  | "paint"
  | "box"
  | "frame"
  | "wall"
  | "eyedropper";

interface BuilderState {
  name: string;
  description: string;
  theme: string;
  loadedTemplateId: string;
  blocks: VoxelBlock[];
  past: VoxelBlock[][];
  future: VoxelBlock[][];
  activeMaterial: BlockMaterialId;
  activeColor: string;
  mode: BuilderMode;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setActiveMaterial: (material: BlockMaterialId) => void;
  setActiveColor: (color: string) => void;
  setMode: (mode: BuilderMode) => void;
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  loadTemplate: (buildingId: string) => void;
  loadBlueprint: (building: BuildingData) => void;
  addBlock: (x: number, y: number, z: number) => void;
  removeBlock: (x: number, y: number, z: number) => void;
  paintBlock: (x: number, y: number, z: number) => void;
  fillBox: (
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
  ) => void;
  fillFrame: (
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
  ) => void;
  buildWall: (
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
    height: number,
  ) => void;
  updateBlockMaterial: (
    x: number,
    y: number,
    z: number,
    material: BlockMaterialId,
  ) => void;
  updateBlockColor: (x: number, y: number, z: number, color: string) => void;
  moveBlock: (
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
  ) => string | null;
  cloneBlock: (
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
  ) => string | null;
  clear: () => void;
  exportBuilding: () => BuildingData;
}

function cloneBlocks(blocks: VoxelBlock[]) {
  return blocks.map((block) => ({
    ...block,
    tags: [...block.tags],
  }));
}

function sortBlocks(blocks: VoxelBlock[]) {
  return [...blocks].sort(
    (left, right) => left.y - right.y || left.z - right.z || left.x - right.x,
  );
}

function upsertBlock(
  blocks: VoxelBlock[],
  x: number,
  y: number,
  z: number,
  material: BlockMaterialId,
  color = blockMaterialLookup[material].color,
) {
  const existing = blocks.find(
    (block) => block.x === x && block.y === y && block.z === z,
  );

  if (existing) {
    return blocks.map((block) =>
      block.id === existing.id
        ? {
            ...block,
            material,
            color,
          }
        : block,
    );
  }

  return [
    ...blocks,
    {
      id: `${x}:${y}:${z}`,
      x,
      y,
      z,
      material,
      color,
      tags: ["custom"],
    },
  ];
}

function removeBlockAt(blocks: VoxelBlock[], x: number, y: number, z: number) {
  return blocks.filter(
    (block) => !(block.x === x && block.y === y && block.z === z),
  );
}

function findBlock(blocks: VoxelBlock[], x: number, y: number, z: number) {
  return blocks.find(
    (block) => block.x === x && block.y === y && block.z === z,
  );
}

function fillVolumeWithMaterial(
  blocks: VoxelBlock[],
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  material: BlockMaterialId,
  color: string,
) {
  let nextBlocks = blocks;
  const x0 = Math.min(start.x, end.x);
  const x1 = Math.max(start.x, end.x);
  const y0 = Math.min(start.y, end.y);
  const y1 = Math.max(start.y, end.y);
  const z0 = Math.min(start.z, end.z);
  const z1 = Math.max(start.z, end.z);

  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      for (let z = z0; z <= z1; z += 1) {
        nextBlocks = upsertBlock(nextBlocks, x, y, z, material, color);
      }
    }
  }

  return nextBlocks;
}

function fillFrameWithMaterial(
  blocks: VoxelBlock[],
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  material: BlockMaterialId,
  color: string,
) {
  let nextBlocks = blocks;
  const x0 = Math.min(start.x, end.x);
  const x1 = Math.max(start.x, end.x);
  const y0 = Math.min(start.y, end.y);
  const y1 = Math.max(start.y, end.y);
  const z0 = Math.min(start.z, end.z);
  const z1 = Math.max(start.z, end.z);

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      for (let z = z0; z <= z1; z += 1) {
        if (x === x0 || x === x1 || z === z0 || z === z1) {
          nextBlocks = upsertBlock(nextBlocks, x, y, z, material, color);
        }
      }
    }
  }

  return nextBlocks;
}

function getLinePoints(
  start: { x: number; z: number },
  end: { x: number; z: number },
) {
  const points: Array<{ x: number; z: number }> = [];
  const deltaX = Math.abs(end.x - start.x);
  const deltaZ = Math.abs(end.z - start.z);
  const stepX = start.x < end.x ? 1 : -1;
  const stepZ = start.z < end.z ? 1 : -1;
  let error = deltaX - deltaZ;
  let x = start.x;
  let z = start.z;

  while (true) {
    points.push({ x, z });

    if (x === end.x && z === end.z) {
      break;
    }

    const doubled = error * 2;

    if (doubled > -deltaZ) {
      error -= deltaZ;
      x += stepX;
    }

    if (doubled < deltaX) {
      error += deltaX;
      z += stepZ;
    }
  }

  return points;
}

function buildWallWithMaterial(
  blocks: VoxelBlock[],
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  height: number,
  material: BlockMaterialId,
  color: string,
) {
  const baseY = Math.max(0, Math.min(12, start.y));
  const cappedHeight = Math.max(1, Math.min(13 - baseY, Math.round(height)));
  const topY = baseY + cappedHeight - 1;
  let nextBlocks = blocks;

  getLinePoints(start, end).forEach((point) => {
    for (let y = baseY; y <= topY; y += 1) {
      nextBlocks = upsertBlock(
        nextBlocks,
        point.x,
        y,
        point.z,
        material,
        color,
      );
    }
  });

  return nextBlocks;
}

const defaultBuilding = cloneBuildingData(sampleBuildings[0]);

export const useBuilderStore = create<BuilderState>((set, get) => ({
  name: defaultBuilding.name,
  description: defaultBuilding.description,
  theme: defaultBuilding.theme,
  loadedTemplateId: defaultBuilding.id,
  blocks: cloneBlocks(defaultBuilding.blocks),
  past: [],
  future: [],
  activeMaterial: "wooden-wall",
  activeColor:
    blockMaterialLookup["wooden-wall"]?.color ??
    blockMaterialLookup.stone.color,
  mode: "hand",
  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setActiveMaterial: (activeMaterial) =>
    set({
      activeMaterial,
      activeColor: blockMaterialLookup[activeMaterial].color,
    }),
  setActiveColor: (activeColor) => set({ activeColor }),
  setMode: (mode) => set({ mode }),
  pushSnapshot: () => {
    const { blocks, past } = get();
    set({ past: [...past, cloneBlocks(blocks)].slice(-60), future: [] });
  },
  undo: () => {
    const { past, future, blocks } = get();

    if (past.length === 0) {
      return;
    }

    const previous = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [cloneBlocks(blocks), ...future].slice(0, 60),
      blocks: previous,
    });
  },
  redo: () => {
    const { past, future, blocks } = get();

    if (future.length === 0) {
      return;
    }

    const next = future[0];
    set({
      past: [...past, cloneBlocks(blocks)].slice(-60),
      future: future.slice(1),
      blocks: next,
    });
  },
  loadTemplate: (buildingId) => {
    const template = sampleBuildingLookup[buildingId];

    if (!template) {
      return;
    }

    const nextBuilding = cloneBuildingData(template);

    set({
      name: nextBuilding.name,
      description: nextBuilding.description,
      theme: nextBuilding.theme,
      loadedTemplateId: nextBuilding.id,
      blocks: cloneBlocks(nextBuilding.blocks),
      past: [],
      future: [],
      activeMaterial: "wooden-wall",
      activeColor:
        blockMaterialLookup["wooden-wall"]?.color ??
        blockMaterialLookup.stone.color,
      mode: "hand",
    });
  },
  loadBlueprint: (building) => {
    const nextBuilding = cloneBuildingData(building);

    set({
      name: nextBuilding.name,
      description: nextBuilding.description,
      theme: nextBuilding.theme,
      loadedTemplateId: nextBuilding.id,
      blocks: cloneBlocks(nextBuilding.blocks),
      past: [],
      future: [],
      activeMaterial: "wooden-wall",
      activeColor:
        blockMaterialLookup["wooden-wall"]?.color ??
        blockMaterialLookup.stone.color,
      mode: "hand",
    });
  },
  addBlock: (x, y, z) => {
    const { activeColor, activeMaterial, blocks } = get();
    set({
      blocks: sortBlocks(
        upsertBlock(blocks, x, y, z, activeMaterial, activeColor),
      ),
    });
  },
  removeBlock: (x, y, z) => {
    const { blocks } = get();
    set({ blocks: sortBlocks(removeBlockAt(blocks, x, y, z)) });
  },
  paintBlock: (x, y, z) => {
    const { activeColor, activeMaterial, blocks } = get();
    set({
      blocks: sortBlocks(
        upsertBlock(blocks, x, y, z, activeMaterial, activeColor),
      ),
    });
  },
  fillBox: (start, end) => {
    const { activeColor, activeMaterial, blocks } = get();

    set({
      blocks: sortBlocks(
        fillVolumeWithMaterial(blocks, start, end, activeMaterial, activeColor),
      ),
    });
  },
  fillFrame: (start, end) => {
    const { activeColor, activeMaterial, blocks } = get();

    set({
      blocks: sortBlocks(
        fillFrameWithMaterial(blocks, start, end, activeMaterial, activeColor),
      ),
    });
  },
  buildWall: (start, end, height) => {
    const { activeColor, activeMaterial, blocks } = get();

    set({
      blocks: sortBlocks(
        buildWallWithMaterial(
          blocks,
          start,
          end,
          height,
          activeMaterial,
          activeColor,
        ),
      ),
    });
  },
  updateBlockMaterial: (x, y, z, material) => {
    const { blocks } = get();
    const existing = findBlock(blocks, x, y, z);

    set({
      blocks: sortBlocks(
        upsertBlock(
          blocks,
          x,
          y,
          z,
          material,
          existing?.color ?? blockMaterialLookup[material].color,
        ),
      ),
    });
  },
  updateBlockColor: (x, y, z, color) => {
    const { blocks } = get();
    const existing = findBlock(blocks, x, y, z);

    if (!existing) {
      return;
    }

    set({
      blocks: sortBlocks(
        upsertBlock(blocks, x, y, z, existing.material, color),
      ),
    });
  },
  moveBlock: (x, y, z, dx, dy, dz) => {
    const { blocks } = get();
    const source = findBlock(blocks, x, y, z);

    if (!source) {
      return null;
    }

    const nextX = Math.max(0, Math.min(23, x + dx));
    const nextY = Math.max(0, Math.min(12, y + dy));
    const nextZ = Math.max(0, Math.min(23, z + dz));

    if (
      (nextX !== x || nextY !== y || nextZ !== z) &&
      findBlock(blocks, nextX, nextY, nextZ)
    ) {
      return null;
    }

    const nextId = `${nextX}:${nextY}:${nextZ}`;

    set({
      blocks: sortBlocks(
        blocks.map((block) =>
          block.id === source.id
            ? {
                ...block,
                id: nextId,
                x: nextX,
                y: nextY,
                z: nextZ,
              }
            : block,
        ),
      ),
    });

    return nextId;
  },
  cloneBlock: (x, y, z, dx, dy, dz) => {
    const { blocks } = get();
    const source = findBlock(blocks, x, y, z);

    if (!source) {
      return null;
    }

    const nextX = Math.max(0, Math.min(23, x + dx));
    const nextY = Math.max(0, Math.min(12, y + dy));
    const nextZ = Math.max(0, Math.min(23, z + dz));

    if (findBlock(blocks, nextX, nextY, nextZ)) {
      return null;
    }

    const nextId = `${nextX}:${nextY}:${nextZ}`;

    set({
      blocks: sortBlocks([
        ...blocks,
        {
          ...source,
          id: nextId,
          x: nextX,
          y: nextY,
          z: nextZ,
          tags: [...source.tags],
        },
      ]),
    });

    return nextId;
  },
  clear: () =>
    set({
      name: "New Build",
      description: "Custom structure in progress.",
      theme: "custom",
      loadedTemplateId: "custom",
      blocks: [],
      past: [],
      future: [],
      activeMaterial: "wooden-wall",
      activeColor:
        blockMaterialLookup["wooden-wall"]?.color ??
        blockMaterialLookup.stone.color,
      mode: "hand",
    }),
  exportBuilding: () => {
    const { blocks, description, loadedTemplateId, name, theme } = get();

    return {
      id:
        loadedTemplateId === "custom"
          ? `custom-${Date.now()}`
          : loadedTemplateId,
      name,
      description,
      theme,
      footprint: deriveFootprintFromBlocks(blocks),
      blocks: cloneBlocks(blocks),
      tags: ["builder-export"],
      suggestedSkills:
        sampleBuildingLookup[loadedTemplateId]?.suggestedSkills ?? [],
    };
  },
}));
