import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { starterTownMap } from "@/data/map-template";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { listSavedMaps } from "@/lib/persistence";

export async function GET() {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const savedMaps = session ? await listSavedMaps(session.userId) : [];
  const savedIds = new Set(savedMaps.map((map) => map.id));

  return NextResponse.json({
    maps: [
      ...savedMaps,
      ...(savedIds.has(starterTownMap.id) ? [] : [starterTownMap]),
    ],
  });
}
