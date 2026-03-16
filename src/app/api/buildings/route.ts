import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { sampleBuildings } from "@/data/buildings";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { listSavedBuildings } from "@/lib/persistence";

export async function GET() {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const savedBuildings = session
    ? await listSavedBuildings(session.userId)
    : [];
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
