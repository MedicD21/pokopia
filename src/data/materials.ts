import type { BlockMaterialDefinition, BlockMaterialId } from "@/lib/types";

export const blockMaterials: BlockMaterialDefinition[] = [
  {
    id: "stone",
    displayName: "Stone Blocks",
    category: "stone",
    color: "#8c99b5",
    obtainMethod: "Quarrying and mountain mining",
    craftingRecipe: "Cut rough stone into reinforced blocks",
    location: "Granite Hollow",
    notes: "Reliable structural material for walls and foundations.",
  },
  {
    id: "wood",
    displayName: "Wood Planks",
    category: "wood",
    color: "#b97a45",
    obtainMethod: "Logging and sawmill processing",
    craftingRecipe: "Saw timber into treated planks",
    location: "Mossroot Forest",
    notes: "Fast to gather and ideal for framing, floors, and trims.",
  },
  {
    id: "metal",
    displayName: "Metal Beams",
    category: "metal",
    color: "#5e6e8a",
    obtainMethod: "Mining ore, smelting, and beam pressing",
    craftingRecipe: "Smelt iron ore into bars, then reinforce into beams",
    location: "Mt. Ember Foundry",
    notes: "Useful for rigid spans, machinery, and high-load builds.",
  },
  {
    id: "glass",
    displayName: "Glass Panels",
    category: "glass",
    color: "#7fd0df",
    obtainMethod: "Refining beach sand in a furnace",
    craftingRecipe: "Melt purified sand and press into panes",
    location: "Sunfoam Coast",
    notes: "Adds light and visibility to laboratories and greenhouses.",
  },
  {
    id: "brick",
    displayName: "Clay Bricks",
    category: "brick",
    color: "#d36f4c",
    obtainMethod: "Clay harvesting and kiln firing",
    craftingRecipe: "Shape clay molds and hard-fire in a kiln",
    location: "Copperclay Flats",
    notes: "Classic civic material with a polished, warm finish.",
  },
  {
    id: "roof",
    displayName: "Roof Tiles",
    category: "roof",
    color: "#f0544f",
    obtainMethod: "Ceramic firing and finishing",
    craftingRecipe: "Press ceramic sheets into fitted roof tiles",
    location: "Red Ridge Kilns",
    notes: "Weather-resistant cover for high-visibility rooftops.",
  },
  {
    id: "decor",
    displayName: "Decorative Trim",
    category: "decor",
    color: "#f6d46b",
    obtainMethod: "Workshop fabrication and salvage",
    craftingRecipe: "Assemble crafted fixtures, signs, and small details",
    location: "Market District",
    notes: "Signage, trims, and lighting details that finish a build.",
  },
];

export const blockMaterialLookup = blockMaterials.reduce<
  Record<BlockMaterialId, BlockMaterialDefinition>
>((lookup, material) => {
  lookup[material.id] = material;
  return lookup;
}, {} as Record<BlockMaterialId, BlockMaterialDefinition>);
