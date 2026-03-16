export type MaterialCategory =
  | "wood"
  | "stone"
  | "metal"
  | "glass"
  | "brick"
  | "roof"
  | "decor";

export type BuildSkill =
  | "heavy lifting"
  | "digging"
  | "stone cutting"
  | "transport"
  | "fire forging"
  | "precision work"
  | "electric power"
  | "water shaping";

export type BlockMaterialId =
  | "stone"
  | "wood"
  | "metal"
  | "glass"
  | "brick"
  | "roof"
  | "decor";

export type RoadType = "dirt" | "stone" | "wood" | "bridge" | "path";
export type Rotation = 0 | 90 | 180 | 270;
export type MapTileType = "empty" | "road" | "decoration";

export interface BlockMaterialDefinition {
  id: BlockMaterialId;
  displayName: string;
  category: MaterialCategory;
  color: string;
  obtainMethod: string;
  craftingRecipe: string;
  location: string;
  notes: string;
}

export interface VoxelBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  material: BlockMaterialId;
  color: string;
  tags: string[];
}

export interface BuildingFootprint {
  width: number;
  depth: number;
  height: number;
}

export interface BuildingData {
  id: string;
  name: string;
  description: string;
  theme: string;
  footprint: BuildingFootprint;
  blocks: VoxelBlock[];
  tags: string[];
  suggestedSkills: BuildSkill[];
}

export interface MaterialCount {
  materialId: BlockMaterialId;
  name: string;
  category: MaterialCategory;
  color: string;
  count: number;
  obtainMethod: string;
  craftingRecipe: string;
  location: string;
  notes: string;
}

export interface PokemonHelper {
  id: string;
  pokemonName: string;
  type: string;
  buildSkill: BuildSkill;
  description: string;
  specialties: MaterialCategory[];
}

export interface PokemonRecommendation extends PokemonHelper {
  score: number;
  reason: string;
}

export interface GridTile {
  x: number;
  y: number;
  tileType: MapTileType;
  roadType?: RoadType;
  buildingId?: string;
  rotation?: Rotation;
  decorationType?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface BuildingPlacement {
  id: string;
  buildingId: string;
  x: number;
  y: number;
  rotation: Rotation;
  label: string;
}

export interface TownMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: GridTile[];
  placements: BuildingPlacement[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedBuildingRecord {
  id: string;
  name: string;
  description: string;
  data: BuildingData;
  createdAt: string;
  updatedAt: string;
}

export interface ScanBlueprintResult {
  blueprint: BuildingData;
  detectedMaterials: BlockMaterialId[];
}

export type StorageMode = "database" | "file";
