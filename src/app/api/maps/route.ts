import { NextResponse } from "next/server";

import { starterTownMap } from "@/data/map-template";
import { listSavedMaps } from "@/lib/persistence";

export async function GET() {
  const savedMaps = await listSavedMaps();
  const savedIds = new Set(savedMaps.map((map) => map.id));

  return NextResponse.json({
    maps: [
      ...savedMaps,
      ...(savedIds.has(starterTownMap.id) ? [] : [starterTownMap]),
    ],
  });
}
