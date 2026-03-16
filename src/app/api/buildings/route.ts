import { NextResponse } from "next/server";

import { sampleBuildings } from "@/data/buildings";
import { listSavedBuildings } from "@/lib/persistence";

export async function GET() {
  const savedBuildings = await listSavedBuildings();
  const starterBuildings = sampleBuildings.map((building) => ({
    id: building.id,
    name: building.name,
    description: building.description,
    data: building,
    createdAt: new Date("2026-03-16T09:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-03-16T09:00:00.000Z").toISOString(),
  }));
  const savedIds = new Set(savedBuildings.map((building) => building.id));

  return NextResponse.json({
    buildings: [
      ...savedBuildings,
      ...starterBuildings.filter((building) => !savedIds.has(building.id)),
    ],
  });
}
