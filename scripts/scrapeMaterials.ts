import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { blockMaterials } from "../src/data/materials";

async function main() {
  const outputPath = path.join(process.cwd(), "storage", "materials-scraped.json");
  const snapshot = blockMaterials.map((material) => ({
    name: material.displayName,
    category: material.category,
    obtain_method: material.obtainMethod,
    crafting_recipe: material.craftingRecipe,
    location: material.location,
    notes: material.notes,
  }));

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(
    [
      `Wrote ${snapshot.length} material records to ${outputPath}.`,
      "This bootstrap script exports the local sample database so a real scraper can replace it later.",
    ].join(" "),
  );
}

main().catch((error) => {
  console.error("Unable to export materials snapshot.", error);
  process.exitCode = 1;
});
