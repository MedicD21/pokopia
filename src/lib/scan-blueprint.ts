import { blockMaterialLookup } from "@/data/materials";
import { deriveFootprintFromBlocks } from "@/lib/materials";
import type {
  BlockMaterialId,
  BuildSkill,
  BuildingData,
  ScanBlueprintResult,
  VoxelBlock,
} from "@/lib/types";

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

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

function isStructuralMaterial(material: BlockMaterialId) {
  return (
    material === "stone" ||
    material === "wood" ||
    material === "metal" ||
    material === "glass" ||
    material === "brick" ||
    material === "beam" ||
    material === "pillar" ||
    material === "roof"
  );
}

function detectMaterials(name: string): BlockMaterialId[] {
  const lowerName = name.toLowerCase();
  const detected = new Set<BlockMaterialId>();

  if (lowerName.includes("glass") || lowerName.includes("greenhouse")) {
    detected.add("glass");
    detected.add("window");
    detected.add("metal");
  }

  if (lowerName.includes("forge") || lowerName.includes("workshop")) {
    detected.add("metal");
    detected.add("beam");
    detected.add("wood");
  }

  if (lowerName.includes("center") || lowerName.includes("clinic")) {
    detected.add("brick");
    detected.add("roof");
    detected.add("door");
  }

  if (lowerName.includes("wood") || lowerName.includes("cabin")) {
    detected.add("wood");
    detected.add("door");
  }

  if (lowerName.includes("window")) {
    detected.add("window");
    detected.add("glass");
  }

  if (lowerName.includes("door") || lowerName.includes("gate")) {
    detected.add("door");
    detected.add("wood");
  }

  if (lowerName.includes("beam")) {
    detected.add("beam");
    detected.add("metal");
  }

  if (lowerName.includes("pillar") || lowerName.includes("column")) {
    detected.add("pillar");
    detected.add("stone");
  }

  if (lowerName.includes("lantern") || lowerName.includes("light")) {
    detected.add("light");
    detected.add("decor");
  }

  if (detected.size === 0) {
    detected.add("stone");
    detected.add("glass");
    detected.add("roof");
  }

  return [...detected];
}

function suggestedSkillsFromMaterials(materials: BlockMaterialId[]): BuildSkill[] {
  const suggestions = new Set<BuildSkill>();

  if (
    materials.includes("stone") ||
    materials.includes("metal") ||
    materials.includes("beam") ||
    materials.includes("pillar")
  ) {
    suggestions.add("heavy lifting");
  }

  if (materials.includes("stone") || materials.includes("pillar")) {
    suggestions.add("digging");
  }

  if (
    materials.includes("metal") ||
    materials.includes("beam") ||
    materials.includes("brick") ||
    materials.includes("roof")
  ) {
    suggestions.add("fire forging");
  }

  if (
    materials.includes("glass") ||
    materials.includes("window") ||
    materials.includes("decor") ||
    materials.includes("light")
  ) {
    suggestions.add("precision work");
  }

  if (materials.includes("glass") || materials.includes("window")) {
    suggestions.add("water shaping");
  }

  suggestions.add("transport");

  return [...suggestions];
}

export function createBlueprintFromUpload(
  fileName: string,
  fileSize: number,
  fileType: string,
): ScanBlueprintResult {
  const seed = hashString(`${fileName}:${fileSize}:${fileType}`);
  const materials = detectMaterials(fileName);
  const structuralMaterials = materials.filter(isStructuralMaterial);
  const primary = structuralMaterials[0] ?? "stone";
  const secondary =
    structuralMaterials.find((material) => material !== primary) ?? "wood";
  const accent =
    materials.find(
      (material) =>
        material === "roof" ||
        material === "decor" ||
        material === "light" ||
        material === "door" ||
        material === "window",
    ) ?? "decor";
  const width = 6 + (seed % 4);
  const depth = 5 + (seed % 3);
  const height = 4 + (seed % 3);
  const blocks = new Map<string, VoxelBlock>();

  for (let x = 0; x < width; x += 1) {
    for (let z = 0; z < depth; z += 1) {
      blocks.set(`${x}:0:${z}`, createBlock(x, 0, z, primary, ["foundation"]));
    }
  }

  for (let x = 0; x < width; x += 1) {
    for (let y = 1; y < height; y += 1) {
      for (let z = 0; z < depth; z += 1) {
        const edge =
          x === 0 || z === 0 || x === width - 1 || z === depth - 1;

        if (!edge) {
          continue;
        }

        const material =
          y === Math.floor(height / 2) && (x + z + seed) % 3 === 0
            ? secondary
            : primary;

        blocks.set(`${x}:${y}:${z}`, createBlock(x, y, z, material, ["wall"]));
      }
    }
  }

  for (let x = 0; x < width; x += 1) {
    for (let z = 0; z < depth; z += 1) {
      const roofMaterial = (x + z + seed) % 5 === 0 ? accent : secondary;
      blocks.set(
        `${x}:${height}:${z}`,
        createBlock(x, height, z, roofMaterial, ["roof"]),
      );
    }
  }

  const doorwayX = Math.floor(width / 2);
  blocks.delete(`${doorwayX}:1:0`);
  blocks.delete(`${doorwayX}:2:0`);
  blocks.set(
    `${doorwayX}:${Math.floor(height / 2)}:0`,
    createBlock(doorwayX, Math.floor(height / 2), 0, "glass", ["window"]),
  );

  const blueprintBlocks = [...blocks.values()].sort(
    (left, right) => left.y - right.y || left.z - right.z || left.x - right.x,
  );

  const blueprint: BuildingData = {
    id: `imported-${seed}`,
    name: "Imported Build",
    description: "Approximate blueprint generated from a single screenshot upload.",
    theme: "imported",
    footprint: deriveFootprintFromBlocks(blueprintBlocks),
    blocks: blueprintBlocks,
    tags: ["imported", "scan-draft", "approximation"],
    suggestedSkills: suggestedSkillsFromMaterials(materials),
  };

  return {
    blueprint,
    detectedMaterials: materials,
  };
}
