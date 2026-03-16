"use client";

import { create } from "zustand";

import { cloneBuildingData, sampleBuildings, sampleBuildingLookup } from "@/data/buildings";
import { blockMaterialLookup } from "@/data/materials";
import { deriveFootprintFromBlocks } from "@/lib/materials";
import type { BlockMaterialId, BuildingData, VoxelBlock } from "@/lib/types";

export type BuilderMode =
  | "hand"
  | "add"
  | "remove"
  | "paint"
  | "box"
  | "eyedropper";

interface BuilderState {
  name: string;
  description: string;
  theme: string;
  loadedTemplateId: string;
  blocks: VoxelBlock[];
  activeMaterial: BlockMaterialId;
  activeLayer: number;
  mode: BuilderMode;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setActiveMaterial: (material: BlockMaterialId) => void;
  setActiveLayer: (layer: number) => void;
  setMode: (mode: BuilderMode) => void;
  loadTemplate: (buildingId: string) => void;
  loadBlueprint: (building: BuildingData) => void;
  addBlock: (x: number, y: number, z: number) => void;
  removeBlock: (x: number, y: number, z: number) => void;
  paintBlock: (x: number, y: number, z: number) => void;
  fillBox: (
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
  ) => void;
  updateBlockMaterial: (
    x: number,
    y: number,
    z: number,
    material: BlockMaterialId,
  ) => void;
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
  clearLayer: (layer: number) => void;
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
            color: blockMaterialLookup[material].color,
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
      color: blockMaterialLookup[material].color,
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
        nextBlocks = upsertBlock(nextBlocks, x, y, z, material);
      }
    }
  }

  return nextBlocks;
}

const defaultBuilding = cloneBuildingData(sampleBuildings[0]);

export const useBuilderStore = create<BuilderState>((set, get) => ({
  name: defaultBuilding.name,
  description: defaultBuilding.description,
  theme: defaultBuilding.theme,
  loadedTemplateId: defaultBuilding.id,
  blocks: cloneBlocks(defaultBuilding.blocks),
  activeMaterial: "stone",
  activeLayer: 0,
  mode: "hand",
  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setActiveMaterial: (activeMaterial) => set({ activeMaterial }),
  setActiveLayer: (layer) =>
    set({
      activeLayer: Math.max(0, Math.min(12, Math.round(layer))),
    }),
  setMode: (mode) => set({ mode }),
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
      activeLayer: 0,
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
      activeLayer: 0,
      mode: "hand",
    });
  },
  addBlock: (x, y, z) => {
    const { activeMaterial, blocks } = get();
    set({ blocks: sortBlocks(upsertBlock(blocks, x, y, z, activeMaterial)) });
  },
  removeBlock: (x, y, z) => {
    const { blocks } = get();
    set({ blocks: sortBlocks(removeBlockAt(blocks, x, y, z)) });
  },
  paintBlock: (x, y, z) => {
    const { activeMaterial, blocks } = get();
    set({ blocks: sortBlocks(upsertBlock(blocks, x, y, z, activeMaterial)) });
  },
  fillBox: (start, end) => {
    const { activeMaterial, blocks } = get();

    set({
      blocks: sortBlocks(fillVolumeWithMaterial(blocks, start, end, activeMaterial)),
    });
  },
  updateBlockMaterial: (x, y, z, material) => {
    const { blocks } = get();
    set({ blocks: sortBlocks(upsertBlock(blocks, x, y, z, material)) });
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
  clearLayer: (layer) => {
    const { blocks } = get();
    set({
      blocks: sortBlocks(blocks.filter((block) => block.y !== layer)),
    });
  },
  clear: () =>
    set({
      name: "New Build",
      description: "Custom structure in progress.",
      theme: "custom",
      loadedTemplateId: "custom",
      blocks: [],
      activeLayer: 0,
      mode: "hand",
    }),
  exportBuilding: () => {
    const { blocks, description, loadedTemplateId, name, theme } = get();

    return {
      id: loadedTemplateId === "custom" ? `custom-${Date.now()}` : loadedTemplateId,
      name,
      description,
      theme,
      footprint: deriveFootprintFromBlocks(blocks),
      blocks: cloneBlocks(blocks),
      tags: ["builder-export"],
      suggestedSkills: sampleBuildingLookup[loadedTemplateId]?.suggestedSkills ?? [],
    };
  },
}));
