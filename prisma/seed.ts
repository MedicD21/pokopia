import { PrismaClient } from "@prisma/client";

import { blockMaterials } from "../src/data/materials";
import { pokemonHelpers } from "../src/data/pokemon-helpers";

const prisma = new PrismaClient();

async function main() {
  for (const material of blockMaterials) {
    await prisma.material.upsert({
      where: { slug: material.id },
      update: {
        name: material.displayName,
        category: material.category,
        obtainMethod: material.obtainMethod,
        craftingRecipe: material.craftingRecipe,
        location: material.location,
        notes: material.notes,
      },
      create: {
        slug: material.id,
        name: material.displayName,
        category: material.category,
        obtainMethod: material.obtainMethod,
        craftingRecipe: material.craftingRecipe,
        location: material.location,
        notes: material.notes,
      },
    });
  }

  for (const helper of pokemonHelpers) {
    await prisma.pokemonHelper.upsert({
      where: { id: helper.id },
      update: {
        pokemonName: helper.pokemonName,
        type: helper.type,
        buildSkill: helper.buildSkill,
        description: helper.description,
        specialties: helper.specialties,
      },
      create: {
        id: helper.id,
        pokemonName: helper.pokemonName,
        type: helper.type,
        buildSkill: helper.buildSkill,
        description: helper.description,
        specialties: helper.specialties,
      },
    });
  }

  console.log(
    `Seeded ${blockMaterials.length} materials and ${pokemonHelpers.length} helper records.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed the database.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
