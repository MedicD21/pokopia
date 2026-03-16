import { NextResponse } from "next/server";

import { sampleBuildings } from "@/data/buildings";
import { listSavedBuildings } from "@/lib/demo-storage";

export async function GET() {
  const savedBuildings = await listSavedBuildings();

  return NextResponse.json({
    buildings: [
      ...sampleBuildings.map((building) => ({
        id: building.id,
        name: building.name,
        description: building.description,
        data: building,
        createdAt: new Date("2026-03-16T09:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-03-16T09:00:00.000Z").toISOString(),
      })),
      ...savedBuildings,
    ],
  });
}
