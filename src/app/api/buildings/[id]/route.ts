import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { sampleBuildingLookup } from "@/data/buildings";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getSavedBuildingById } from "@/lib/persistence";

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

  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json(
      { error: "Sign in to access your saved builds." },
      { status: 401 },
    );
  }

  const saved = await getSavedBuildingById(id, session.userId);

  if (!saved) {
    return NextResponse.json({ error: "Building not found." }, { status: 404 });
  }

  return NextResponse.json({ building: saved });
}
