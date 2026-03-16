import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { SavedBuildingRecord, TownMap } from "@/lib/types";

const storageRoot = path.join(process.cwd(), "storage");
const buildingsPath = path.join(storageRoot, "saved-buildings.json");
const mapsPath = path.join(storageRoot, "saved-maps.json");

async function ensureStorageRoot() {
  await mkdir(storageRoot, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filePath: string, payload: T) {
  await ensureStorageRoot();
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function listSavedBuildings() {
  return readJson<SavedBuildingRecord[]>(buildingsPath, []);
}

export async function getSavedBuildingById(id: string) {
  const buildings = await listSavedBuildings();
  return buildings.find((building) => building.id === id) ?? null;
}

export async function upsertSavedBuilding(
  record: Omit<SavedBuildingRecord, "createdAt" | "updatedAt">,
) {
  const buildings = await listSavedBuildings();
  const now = new Date().toISOString();
  const existing = buildings.find((building) => building.id === record.id);

  const nextRecord: SavedBuildingRecord = {
    ...record,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const nextBuildings = existing
    ? buildings.map((building) =>
        building.id === record.id ? nextRecord : building,
      )
    : [nextRecord, ...buildings];

  await writeJson(buildingsPath, nextBuildings);

  return nextRecord;
}

export async function listSavedMaps() {
  return readJson<TownMap[]>(mapsPath, []);
}

export async function saveMapRecord(
  map: Omit<TownMap, "createdAt" | "updatedAt">,
) {
  const maps = await listSavedMaps();
  const now = new Date().toISOString();
  const existing = maps.find((entry) => entry.id === map.id);

  const nextMap: TownMap = {
    ...map,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const nextMaps = existing
    ? maps.map((entry) => (entry.id === map.id ? nextMap : entry))
    : [nextMap, ...maps];

  await writeJson(mapsPath, nextMaps);

  return nextMap;
}
