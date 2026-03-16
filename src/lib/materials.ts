import { blockMaterialLookup, blockMaterials } from "@/data/materials";
import { pokemonHelpers } from "@/data/pokemon-helpers";
import type {
  BlockMaterialId,
  BuildingData,
  BuildSkill,
  MaterialCategory,
  MaterialCount,
  PokemonRecommendation,
  VoxelBlock,
} from "@/lib/types";

export function countBlocksByMaterial(blocks: VoxelBlock[]) {
  const initial = blockMaterials.reduce<Record<BlockMaterialId, number>>(
    (acc, m) => { acc[m.id] = 0; return acc; },
    {} as Record<BlockMaterialId, number>,
  );
  return blocks.reduce<Record<BlockMaterialId, number>>(
    (counts, block) => {
      counts[block.material] = (counts[block.material] ?? 0) + 1;
      return counts;
    },
    initial,
  );
}

export function generateMaterialsList(
  input: BuildingData | VoxelBlock[],
): MaterialCount[] {
  const blocks = Array.isArray(input) ? input : input.blocks;
  const counts = countBlocksByMaterial(blocks);

  return (Object.entries(counts) as [BlockMaterialId, number][])
    .filter(([, count]) => count > 0)
    .map(([materialId, count]) => {
      const definition = blockMaterialLookup[materialId];

      return {
        materialId,
        name: definition.displayName,
        catalogMatchName: definition.catalogMatchName,
        imageUrl: definition.imageUrl,
        category: definition.category,
        color: definition.color,
        count,
        obtainMethod: definition.obtainMethod,
        craftingRecipe: definition.craftingRecipe,
        location: definition.location,
        notes: definition.notes,
      };
    })
    .sort((left, right) => right.count - left.count);
}

export function deriveFootprintFromBlocks(blocks: VoxelBlock[]) {
  if (blocks.length === 0) {
    return { width: 0, depth: 0, height: 0 };
  }

  const xs = blocks.map((block) => block.x);
  const ys = blocks.map((block) => block.y);
  const zs = blocks.map((block) => block.z);

  return {
    width: Math.max(...xs) - Math.min(...xs) + 1,
    depth: Math.max(...zs) - Math.min(...zs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
  };
}

export function totalBlocks(blocks: VoxelBlock[]) {
  return blocks.length;
}

export function topSkillsForMaterials(materials: MaterialCount[]) {
  const skillWeights: Record<BuildSkill, number> = {
    "heavy lifting": 0,
    digging: 0,
    "stone cutting": 0,
    transport: 0,
    "fire forging": 0,
    "precision work": 0,
    "electric power": 0,
    "water shaping": 0,
  };

  for (const material of materials) {
    if (material.category === "stone" || material.category === "metal") {
      skillWeights["heavy lifting"] += material.count;
    }

    if (material.category === "stone") {
      skillWeights.digging += Math.floor(material.count * 0.65);
      skillWeights["stone cutting"] += material.count;
      skillWeights["water shaping"] += Math.floor(material.count * 0.4);
    }

    if (material.category === "metal" || material.category === "brick" || material.category === "roof") {
      skillWeights["fire forging"] += material.count;
    }

    if (material.category === "glass" || material.category === "decor" || material.category === "roof") {
      skillWeights["precision work"] += material.count;
    }

    if (material.category === "decor" || material.category === "glass" || material.category === "metal") {
      skillWeights["electric power"] += Math.floor(material.count * 0.5);
    }

    if (material.category === "wood" || material.category === "decor" || material.category === "brick") {
      skillWeights.transport += Math.floor(material.count * 0.55);
    }
  }

  return Object.entries(skillWeights)
    .sort((left, right) => right[1] - left[1])
    .map(([skill, score]) => ({ skill: skill as BuildSkill, score }))
    .filter(({ score }) => score > 0);
}

function categoryTotals(materials: MaterialCount[]) {
  return materials.reduce<Record<MaterialCategory, number>>(
    (totals, material) => {
      totals[material.category] += material.count;
      return totals;
    },
    {
      wood: 0,
      stone: 0,
      metal: 0,
      glass: 0,
      brick: 0,
      roof: 0,
      decor: 0,
    },
  );
}

function labelCategory(category: MaterialCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function recommendPokemonHelpers(
  materials: MaterialCount[],
  limit = 4,
): PokemonRecommendation[] {
  const totals = categoryTotals(materials);

  return pokemonHelpers
    .map((helper) => {
      const score = helper.specialties.reduce(
        (sum, specialty) => sum + totals[specialty],
        0,
      );

      if (score === 0) {
        return null;
      }

      const dominant = helper.specialties
        .map((specialty) => ({
          specialty,
          score: totals[specialty],
        }))
        .sort((left, right) => right.score - left.score)[0];

      const reason = dominant
        ? `${labelCategory(dominant.specialty)}-heavy workload with ${dominant.score} blocks fits ${helper.buildSkill}.`
        : helper.description;

      return {
        ...helper,
        score,
        reason,
      };
    })
    .filter((helper): helper is PokemonRecommendation => helper !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function summarizeMaterials(input: BuildingData | VoxelBlock[]) {
  const blocks = Array.isArray(input) ? input : input.blocks;
  const materials = generateMaterialsList(blocks);

  return {
    materials,
    helpers: recommendPokemonHelpers(materials),
    totalBlocks: totalBlocks(blocks),
    footprint: deriveFootprintFromBlocks(blocks),
    topSkills: topSkillsForMaterials(materials),
  };
}
