import "server-only";

import type { Building, Map as PrismaMap, Prisma } from "@prisma/client";

import {
  getSavedBuildingById as getFileSavedBuildingById,
  listSavedBuildings as listFileSavedBuildings,
  listSavedMaps as listFileSavedMaps,
  saveMapRecord as saveFileMapRecord,
  upsertSavedBuilding as upsertFileSavedBuilding,
} from "@/lib/demo-storage";
import { isDatabaseConfigured, prisma } from "@/lib/db";
import type {
  BuildingData,
  SavedBuildingRecord,
  StorageMode,
  TownMap,
} from "@/lib/types";

function toSavedBuildingRecord(building: Building): SavedBuildingRecord {
  const data = building.data as unknown as BuildingData;
  const description = building.description ?? data.description ?? "";

  return {
    id: building.id,
    name: building.name,
    description,
    data: {
      ...data,
      id: building.id,
      name: building.name,
      description,
      theme: building.theme ?? data.theme,
    },
    createdAt: building.createdAt.toISOString(),
    updatedAt: building.updatedAt.toISOString(),
  };
}

function toTownMapRecord(map: PrismaMap): TownMap {
  const payload = map.tiles as unknown as Pick<TownMap, "tiles" | "placements">;

  return {
    id: map.id,
    name: map.name,
    width: map.width,
    height: map.height,
    tiles: payload.tiles ?? [],
    placements: payload.placements ?? [],
    createdAt: map.createdAt.toISOString(),
    updatedAt: map.updatedAt.toISOString(),
  };
}

function toBuildingJson(data: BuildingData): Prisma.InputJsonValue {
  return data as unknown as Prisma.InputJsonValue;
}

function toMapJson(payload: Pick<TownMap, "tiles" | "placements">): Prisma.InputJsonValue {
  return payload as unknown as Prisma.InputJsonValue;
}

export function getStorageMode(): StorageMode {
  return isDatabaseConfigured() && prisma ? "database" : "file";
}

export async function listSavedBuildings() {
  if (!prisma) {
    return listFileSavedBuildings();
  }

  try {
    const buildings = await prisma.building.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return buildings.map(toSavedBuildingRecord);
  } catch {
    return listFileSavedBuildings();
  }
}

export async function getSavedBuildingById(id: string) {
  if (!prisma) {
    return getFileSavedBuildingById(id);
  }

  try {
    const building = await prisma.building.findUnique({
      where: { id },
    });

    return building ? toSavedBuildingRecord(building) : null;
  } catch {
    return getFileSavedBuildingById(id);
  }
}

export async function saveBuildingRecord(input: {
  id?: string;
  name: string;
  description: string;
  data: BuildingData;
}) {
  const id = input.id ?? crypto.randomUUID();

  if (!prisma) {
    const record = await upsertFileSavedBuilding({
      id,
      name: input.name,
      description: input.description,
      data: {
        ...input.data,
        id,
        name: input.name,
        description: input.description,
      },
    });

    return {
      building: record,
      storageMode: getStorageMode(),
    };
  }

  try {
    const building = await prisma.building.upsert({
      where: { id },
      update: {
        name: input.name,
        description: input.description,
        theme: input.data.theme,
        data: toBuildingJson({
          ...input.data,
          id,
          name: input.name,
          description: input.description,
        }),
      },
      create: {
        id,
        name: input.name,
        description: input.description,
        theme: input.data.theme,
        data: toBuildingJson({
          ...input.data,
          id,
          name: input.name,
          description: input.description,
        }),
      },
    });

    return {
      building: toSavedBuildingRecord(building),
      storageMode: getStorageMode(),
    };
  } catch {
    const record = await upsertFileSavedBuilding({
      id,
      name: input.name,
      description: input.description,
      data: {
        ...input.data,
        id,
        name: input.name,
        description: input.description,
      },
    });

    return {
      building: record,
      storageMode: "file" as const,
    };
  }
}

export async function listSavedMaps() {
  if (!prisma) {
    return listFileSavedMaps();
  }

  try {
    const maps = await prisma.map.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return maps.map(toTownMapRecord);
  } catch {
    return listFileSavedMaps();
  }
}

export async function saveMapRecord(input: Omit<TownMap, "createdAt" | "updatedAt">) {
  if (!prisma) {
    const map = await saveFileMapRecord(input);

    return {
      map,
      storageMode: getStorageMode(),
    };
  }

  try {
    const map = await prisma.map.upsert({
      where: { id: input.id },
      update: {
        name: input.name,
        width: input.width,
        height: input.height,
        tiles: toMapJson({
          tiles: input.tiles,
          placements: input.placements,
        }),
      },
      create: {
        id: input.id,
        name: input.name,
        width: input.width,
        height: input.height,
        tiles: toMapJson({
          tiles: input.tiles,
          placements: input.placements,
        }),
      },
    });

    return {
      map: toTownMapRecord(map),
      storageMode: getStorageMode(),
    };
  } catch {
    const map = await saveFileMapRecord(input);

    return {
      map,
      storageMode: "file" as const,
    };
  }
}
