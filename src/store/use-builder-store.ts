"use client";

import { create } from "zustand";

import { cloneBuildingData, sampleBuildings, sampleBuildingLookup } from "@/data/buildings";
import { blockMaterialLookup } from "@/data/materials";
import { deriveFootprintFromBlocks } from "@/lib/materials";
import type { BlockMaterialId, BuildingData, VoxelBlock } from "@/lib/types";

export type BuilderMode = "add" | "remove" | "paint";

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

const defaultBuilding = cloneBuildingData(sampleBuildings[0]);

export const useBuilderStore = create<BuilderState>((set, get) => ({
  name: defaultBuilding.name,
  description: defaultBuilding.description,
  theme: defaultBuilding.theme,
  loadedTemplateId: defaultBuilding.id,
  blocks: cloneBlocks(defaultBuilding.blocks),
  activeMaterial: "stone",
  activeLayer: 0,
  mode: "add",
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
      mode: "add",
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
      mode: "add",
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
  clear: () =>
    set({
      name: "New Build",
      description: "Custom structure in progress.",
      theme: "custom",
      loadedTemplateId: "custom",
      blocks: [],
      activeLayer: 0,
      mode: "add",
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
