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

function isVercelDeployment() {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown error";
}

function assertLocalSaveFallbackAvailable(target: "building" | "map") {
  if (!isVercelDeployment()) {
    return;
  }

  throw new Error(
    `Vercel deployments require a configured database URL for ${target} saves. ` +
      "The local JSON fallback in storage/ is for local development only.",
  );
}

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

function toMapJson(
  payload: Pick<TownMap, "tiles" | "placements">,
): Prisma.InputJsonValue {
  return payload as unknown as Prisma.InputJsonValue;
}

export function getStorageMode(): StorageMode {
  return isDatabaseConfigured() && prisma ? "database" : "file";
}

export async function listSavedBuildings(ownerId?: string) {
  if (!prisma) {
    return ownerId ? [] : listFileSavedBuildings();
  }

  try {
    const buildings = await prisma.building.findMany({
      where: ownerId ? { ownerId } : undefined,
      orderBy: { updatedAt: "desc" },
    });

    return buildings.map(toSavedBuildingRecord);
  } catch {
    return ownerId ? [] : listFileSavedBuildings();
  }
}

export async function getSavedBuildingById(id: string, ownerId?: string) {
  if (!prisma) {
    return ownerId ? null : getFileSavedBuildingById(id);
  }

  try {
    const building = await prisma.building.findFirst({
      where: {
        id,
        ...(ownerId ? { ownerId } : {}),
      },
    });

    return building ? toSavedBuildingRecord(building) : null;
  } catch {
    return ownerId ? null : getFileSavedBuildingById(id);
  }
}

export async function saveBuildingRecord(input: {
  id?: string;
  ownerId?: string;
  name: string;
  description: string;
  data: BuildingData;
}) {
  let id = input.id ?? crypto.randomUUID();

  if (!prisma) {
    assertLocalSaveFallbackAvailable("building");

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
    if (input.ownerId && input.id) {
      const existing = await prisma.building.findUnique({
        where: { id: input.id },
        select: { ownerId: true },
      });

      if (existing?.ownerId && existing.ownerId !== input.ownerId) {
        id = crypto.randomUUID();
      }
    }

    const building = await prisma.building.upsert({
      where: { id },
      update: {
        name: input.name,
        description: input.description,
        ownerId: input.ownerId ?? undefined,
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
        ownerId: input.ownerId ?? null,
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
  } catch (error) {
    if (isVercelDeployment()) {
      throw new Error(
        `Unable to save the building to PostgreSQL on Vercel. ${getErrorMessage(error)}`,
      );
    }

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

export async function listSavedMaps(ownerId?: string) {
  if (!prisma) {
    return ownerId ? [] : listFileSavedMaps();
  }

  try {
    const maps = await prisma.map.findMany({
      where: ownerId ? { ownerId } : undefined,
      orderBy: { updatedAt: "desc" },
    });

    return maps.map(toTownMapRecord);
  } catch {
    return ownerId ? [] : listFileSavedMaps();
  }
}

export async function saveMapRecord(
  input: Omit<TownMap, "createdAt" | "updatedAt">,
  ownerId?: string,
) {
  if (!prisma) {
    assertLocalSaveFallbackAvailable("map");

    const map = await saveFileMapRecord(input);

    return {
      map,
      storageMode: getStorageMode(),
    };
  }

  try {
    let id = input.id;

    if (ownerId && input.id) {
      const existing = await prisma.map.findUnique({
        where: { id: input.id },
        select: { ownerId: true },
      });

      if (existing?.ownerId && existing.ownerId !== ownerId) {
        id = crypto.randomUUID();
      }
    }

    const map = await prisma.map.upsert({
      where: { id },
      update: {
        name: input.name,
        ownerId: ownerId ?? undefined,
        width: input.width,
        height: input.height,
        tiles: toMapJson({
          tiles: input.tiles,
          placements: input.placements,
        }),
      },
      create: {
        id,
        name: input.name,
        ownerId: ownerId ?? null,
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
  } catch (error) {
    if (isVercelDeployment()) {
      throw new Error(
        `Unable to save the map to PostgreSQL on Vercel. ${getErrorMessage(error)}`,
      );
    }

    const map = await saveFileMapRecord(input);

    return {
      map,
      storageMode: "file" as const,
    };
  }
}
