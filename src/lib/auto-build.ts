import { blockMaterialLookup } from "@/data/materials";
import {
  deriveFootprintFromBlocks,
  generateMaterialsList,
  topSkillsForMaterials,
} from "@/lib/materials";
import type {
  AutoBuildOptions,
  AutoBuildStyle,
  BlockMaterialId,
  BuildingData,
  BuildSkill,
  VoxelBlock,
} from "@/lib/types";

const minFootprint = 5;
const maxFootprint = 20;
const minWallHeight = 3;
const maxWallHeight = 8;
const maxTotalHeight = 12;

const styleMetadata: Record<
  AutoBuildStyle,
  { label: string; theme: string; tags: string[] }
> = {
  cottage: {
    label: "Cottage",
    theme: "cozy",
    tags: ["cozy", "home", "starter"],
  },
  hall: {
    label: "Guild Hall",
    theme: "civic",
    tags: ["civic", "gathering", "large-footprint"],
  },
  workshop: {
    label: "Workshop",
    theme: "industrial",
    tags: ["crafting", "industrial", "maker"],
  },
  greenhouse: {
    label: "Greenhouse",
    theme: "garden",
    tags: ["garden", "glass", "botanical"],
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function titleCase(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
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

function setBlock(
  blocks: Map<string, VoxelBlock>,
  x: number,
  y: number,
  z: number,
  material: BlockMaterialId,
  tags: string[] = [],
) {
  blocks.set(`${x}:${y}:${z}`, createBlock(x, y, z, material, tags));
}

function removeBlock(blocks: Map<string, VoxelBlock>, x: number, y: number, z: number) {
  blocks.delete(`${x}:${y}:${z}`);
}

function fillPlane(
  blocks: Map<string, VoxelBlock>,
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
  material: BlockMaterialId,
  tags: string[] = [],
) {
  for (let x = x0; x <= x1; x += 1) {
    for (let z = z0; z <= z1; z += 1) {
      setBlock(blocks, x, y, z, material, tags);
    }
  }
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
        setBlock(blocks, x, y, z, material, tags);
      }
    }
  }
}

function setPerimeter(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  y0: number,
  y1: number,
  material: BlockMaterialId,
  tags: string[] = [],
) {
  for (let x = 0; x < width; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      for (let z = 0; z < depth; z += 1) {
        if (x !== 0 && z !== 0 && x !== width - 1 && z !== depth - 1) {
          continue;
        }

        setBlock(blocks, x, y, z, material, tags);
      }
    }
  }
}

function getCenteredSpan(length: number, span: number) {
  const start = Math.max(0, Math.floor((length - span) / 2));
  return {
    start,
    end: Math.min(length - 1, start + span - 1),
  };
}

function formatBuildName(options: AutoBuildOptions) {
  const prompt = titleCase(options.prompt);

  if (prompt) {
    return prompt;
  }

  return `${styleMetadata[options.style].label} ${options.width}x${options.depth}`;
}

function formatBuildDescription(options: AutoBuildOptions) {
  const optionalPieces = [
    options.includeDoor ? blockMaterialLookup[options.doorMaterial].displayName : null,
    options.includeWindows ? blockMaterialLookup[options.windowMaterial].displayName : null,
    options.includeBeams ? blockMaterialLookup[options.beamMaterial].displayName : null,
    options.includePillars ? blockMaterialLookup[options.pillarMaterial].displayName : null,
    options.includeLights ? blockMaterialLookup[options.lightMaterial].displayName : null,
    options.includeDecor ? blockMaterialLookup[options.decorMaterial].displayName : null,
  ].filter((value): value is string => Boolean(value));

  const coreText =
    `${styleMetadata[options.style].label} shell using ` +
    `${blockMaterialLookup[options.wallMaterial].displayName.toLowerCase()} walls, ` +
    `${blockMaterialLookup[options.roofMaterial].displayName.toLowerCase()} roofing, and ` +
    `${blockMaterialLookup[options.trimMaterial].displayName.toLowerCase()} trim.`;

  if (optionalPieces.length === 0) {
    return `${coreText} Generated from the in-app AI build assistant.`;
  }

  return `${coreText} Auto-fitted with ${optionalPieces.join(", ")} details.`;
}

function placeFrontDoor(
  blocks: Map<string, VoxelBlock>,
  width: number,
  wallHeight: number,
  material: BlockMaterialId,
) {
  const doorWidth = width >= 8 ? 2 : 1;
  const doorHeight = Math.min(3, wallHeight);
  const span = getCenteredSpan(width, doorWidth);

  for (let x = span.start; x <= span.end; x += 1) {
    for (let y = 1; y <= doorHeight; y += 1) {
      removeBlock(blocks, x, y, 0);
      setBlock(blocks, x, y, 0, material, ["entry", "door"]);
    }
  }

  return span;
}

function carveFrontEntry(blocks: Map<string, VoxelBlock>, width: number, wallHeight: number) {
  const doorWidth = width >= 8 ? 2 : 1;
  const doorHeight = Math.min(3, wallHeight);
  const span = getCenteredSpan(width, doorWidth);

  for (let x = span.start; x <= span.end; x += 1) {
    for (let y = 1; y <= doorHeight; y += 1) {
      removeBlock(blocks, x, y, 0);
    }
  }

  return span;
}

function addWindowBand(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  wallHeight: number,
  material: BlockMaterialId,
  doorSpan: { start: number; end: number },
  style: AutoBuildStyle,
) {
  const y0 = Math.min(wallHeight - 1, 2);
  const y1 = Math.max(y0, Math.min(wallHeight - 1, style === "greenhouse" ? wallHeight - 1 : 3));

  if (y1 < 1) {
    return;
  }

  for (let x = 2; x <= width - 3; x += 3) {
    if (x >= doorSpan.start && x <= doorSpan.end + 1) {
      continue;
    }

    for (let y = y0; y <= y1; y += 1) {
      setBlock(blocks, x, y, 0, material, ["window", "front"]);
      setBlock(blocks, x, y, depth - 1, material, ["window", "rear"]);
    }
  }

  for (let z = 2; z <= depth - 3; z += 3) {
    for (let y = y0; y <= y1; y += 1) {
      setBlock(blocks, 0, y, z, material, ["window", "side"]);
      setBlock(blocks, width - 1, y, z, material, ["window", "side"]);
    }
  }
}

function addCornerPillars(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  wallHeight: number,
  material: BlockMaterialId,
) {
  const corners = [
    { x: 0, z: 0 },
    { x: width - 1, z: 0 },
    { x: 0, z: depth - 1 },
    { x: width - 1, z: depth - 1 },
  ];

  corners.forEach((corner) => {
    for (let y = 1; y <= wallHeight; y += 1) {
      setBlock(blocks, corner.x, y, corner.z, material, ["pillar", "corner"]);
    }
  });
}

function addBeamRing(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  y: number,
  material: BlockMaterialId,
) {
  setPerimeter(blocks, width, depth, y, y, material, ["beam", "ring"]);
}

function addFrontLights(
  blocks: Map<string, VoxelBlock>,
  width: number,
  material: BlockMaterialId,
  doorSpan: { start: number; end: number },
) {
  const leftX = Math.max(0, doorSpan.start - 1);
  const rightX = Math.min(width - 1, doorSpan.end + 1);

  setBlock(blocks, leftX, 2, 0, material, ["light", "entry"]);
  setBlock(blocks, rightX, 2, 0, material, ["light", "entry"]);
}

function addDecorAccents(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  wallHeight: number,
  roofTopY: number,
  material: BlockMaterialId,
) {
  const centerX = Math.floor(width / 2);
  const backZ = depth - 1;

  setBlock(blocks, centerX, wallHeight, backZ, material, ["decor", "sign"]);
  setBlock(blocks, centerX, roofTopY, Math.floor(depth / 2), material, ["decor", "roof"]);
}

function addSteppedRoof(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  startY: number,
  roofHeight: number,
  material: BlockMaterialId,
) {
  let topY = startY;

  for (let layer = 0; layer < roofHeight; layer += 1) {
    const inset = layer;
    const x0 = inset;
    const x1 = width - 1 - inset;
    const z0 = inset;
    const z1 = depth - 1 - inset;

    if (x0 > x1 || z0 > z1) {
      break;
    }

    topY = startY + layer;
    fillPlane(blocks, x0, x1, topY, z0, z1, material, ["roof", "stepped"]);
  }

  return topY;
}

function addHallRoof(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  startY: number,
  roofHeight: number,
  material: BlockMaterialId,
) {
  let topY = startY;

  for (let layer = 0; layer < roofHeight; layer += 1) {
    const y = startY + layer;
    topY = y;

    if (width >= depth) {
      const z0 = layer;
      const z1 = depth - 1 - layer;

      if (z0 > z1) {
        break;
      }

      fillPlane(blocks, 0, width - 1, y, z0, z1, material, ["roof", "hall"]);
      continue;
    }

    const x0 = layer;
    const x1 = width - 1 - layer;

    if (x0 > x1) {
      break;
    }

    fillPlane(blocks, x0, x1, y, 0, depth - 1, material, ["roof", "hall"]);
  }

  return topY;
}

function addFlatWorkshopRoof(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  startY: number,
  roofHeight: number,
  roofMaterial: BlockMaterialId,
  beamMaterial: BlockMaterialId,
) {
  fillPlane(blocks, 0, width - 1, startY, 0, depth - 1, roofMaterial, ["roof", "flat"]);

  let topY = startY;

  for (let layer = 1; layer < roofHeight; layer += 1) {
    const inset = Math.min(layer, 1);
    topY = startY + layer;
    fillPlane(
      blocks,
      inset,
      width - 1 - inset,
      topY,
      inset,
      depth - 1 - inset,
      beamMaterial,
      ["roof", "cap"],
    );
  }

  return topY;
}

function addGreenhouseRoof(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  startY: number,
  roofHeight: number,
  roofMaterial: BlockMaterialId,
  beamMaterial: BlockMaterialId,
) {
  let topY = startY;

  for (let layer = 0; layer < roofHeight; layer += 1) {
    const y = startY + layer;
    const inset = layer;
    const x0 = inset;
    const x1 = width - 1 - inset;
    const z0 = inset;
    const z1 = depth - 1 - inset;

    if (x0 > x1 || z0 > z1) {
      break;
    }

    topY = y;

    for (let x = x0; x <= x1; x += 1) {
      for (let z = z0; z <= z1; z += 1) {
        const onFrame =
          x === x0 ||
          x === x1 ||
          z === z0 ||
          z === z1 ||
          x === Math.floor((x0 + x1) / 2);

        setBlock(
          blocks,
          x,
          y,
          z,
          onFrame ? beamMaterial : roofMaterial,
          onFrame ? ["roof", "frame"] : ["roof", "glasshouse"],
        );
      }
    }
  }

  return topY;
}

function getRoofTopY(
  blocks: Map<string, VoxelBlock>,
  width: number,
  depth: number,
  wallHeight: number,
  roofHeight: number,
  options: AutoBuildOptions,
) {
  const roofBaseY = wallHeight + 1;

  if (options.style === "workshop") {
    return addFlatWorkshopRoof(
      blocks,
      width,
      depth,
      roofBaseY,
      roofHeight,
      options.roofMaterial,
      options.beamMaterial,
    );
  }

  if (options.style === "greenhouse") {
    return addGreenhouseRoof(
      blocks,
      width,
      depth,
      roofBaseY,
      roofHeight,
      options.roofMaterial,
      options.beamMaterial,
    );
  }

  if (options.style === "hall") {
    return addHallRoof(blocks, width, depth, roofBaseY, roofHeight, options.roofMaterial);
  }

  return addSteppedRoof(blocks, width, depth, roofBaseY, roofHeight, options.roofMaterial);
}

function buildSuggestedSkills(blocks: VoxelBlock[]): BuildSkill[] {
  return topSkillsForMaterials(generateMaterialsList(blocks))
    .slice(0, 3)
    .map(({ skill }) => skill);
}

function normalizeOptions(options: AutoBuildOptions): AutoBuildOptions {
  const width = clamp(options.width, minFootprint, maxFootprint);
  const depth = clamp(options.depth, minFootprint, maxFootprint);
  const wallHeight = clamp(options.wallHeight, minWallHeight, maxWallHeight);
  const maxRoofHeight = Math.max(1, maxTotalHeight - wallHeight);
  const roofHeight = clamp(options.roofHeight, 1, maxRoofHeight);

  return {
    ...options,
    width,
    depth,
    wallHeight,
    roofHeight,
    prompt: options.prompt.trim(),
  };
}

export function createAutoBuildBlueprint(input: AutoBuildOptions): BuildingData {
  const options = normalizeOptions(input);
  const blocks = new Map<string, VoxelBlock>();
  const wallTopY = options.wallHeight;

  fillPlane(
    blocks,
    0,
    options.width - 1,
    0,
    0,
    options.depth - 1,
    options.foundationMaterial,
    ["foundation"],
  );

  fillPlane(
    blocks,
    1,
    Math.max(1, options.width - 2),
    1,
    1,
    Math.max(1, options.depth - 2),
    options.trimMaterial,
    ["floor"],
  );

  setPerimeter(blocks, options.width, options.depth, 1, wallTopY, options.wallMaterial, ["wall"]);

  const doorSpan = options.includeDoor
    ? placeFrontDoor(blocks, options.width, options.wallHeight, options.doorMaterial)
    : carveFrontEntry(blocks, options.width, options.wallHeight);

  if (options.includeWindows) {
    addWindowBand(
      blocks,
      options.width,
      options.depth,
      options.wallHeight,
      options.windowMaterial,
      doorSpan,
      options.style,
    );
  }

  if (options.includePillars) {
    addCornerPillars(
      blocks,
      options.width,
      options.depth,
      options.wallHeight,
      options.pillarMaterial,
    );
  }

  if (options.includeBeams) {
    addBeamRing(blocks, options.width, options.depth, wallTopY, options.beamMaterial);
  }

  if (options.style === "workshop" && options.includeBeams) {
    fillVolume(
      blocks,
      options.width - 2,
      options.width - 2,
      1,
      options.wallHeight,
      1,
      1,
      options.beamMaterial,
      ["support", "gantry"],
    );
  }

  if (options.style === "greenhouse") {
    const centerX = Math.floor(options.width / 2);
    fillVolume(
      blocks,
      centerX,
      centerX,
      1,
      options.wallHeight,
      1,
      options.depth - 2,
      options.beamMaterial,
      ["spine", "greenhouse"],
    );
  }

  const roofTopY = getRoofTopY(
    blocks,
    options.width,
    options.depth,
    options.wallHeight,
    options.roofHeight,
    options,
  );

  if (options.includeLights) {
    addFrontLights(blocks, options.width, options.lightMaterial, doorSpan);
  }

  if (options.includeDecor) {
    addDecorAccents(
      blocks,
      options.width,
      options.depth,
      options.wallHeight,
      roofTopY,
      options.decorMaterial,
    );
  }

  const sortedBlocks = [...blocks.values()].sort(
    (left, right) => left.y - right.y || left.z - right.z || left.x - right.x,
  );
  const skills = buildSuggestedSkills(sortedBlocks);
  const promptTag = options.prompt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    id: `auto-${Date.now()}`,
    name: formatBuildName(options),
    description: formatBuildDescription(options),
    theme: styleMetadata[options.style].theme,
    footprint: deriveFootprintFromBlocks(sortedBlocks),
    blocks: sortedBlocks,
    tags: [
      "auto-build",
      "assistant-generated",
      options.style,
      ...styleMetadata[options.style].tags,
      ...(promptTag ? [promptTag] : []),
      ...(options.includeDoor ? ["door"] : []),
      ...(options.includeWindows ? ["windows"] : []),
      ...(options.includePillars ? ["pillars"] : []),
      ...(options.includeBeams ? ["beams"] : []),
      ...(options.includeLights ? ["lights"] : []),
      ...(options.includeDecor ? ["decor"] : []),
    ],
    suggestedSkills: skills.length > 0 ? skills : ["heavy lifting", "transport", "precision work"],
  };
}
