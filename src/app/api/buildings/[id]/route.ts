import { NextResponse } from "next/server";

import { sampleBuildingLookup } from "@/data/buildings";
import { getSavedBuildingById } from "@/lib/demo-storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const starter = sampleBuildingLookup[id];

  if (starter) {
    return NextResponse.json({
      building: {
        id: starter.id,
        name: starter.name,
        description: starter.description,
        data: starter,
        createdAt: new Date("2026-03-16T09:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-03-16T09:00:00.000Z").toISOString(),
      },
    });
  }

  const saved = await getSavedBuildingById(id);

  if (!saved) {
    return NextResponse.json({ error: "Building not found." }, { status: 404 });
  }

  return NextResponse.json({ building: saved });
}
