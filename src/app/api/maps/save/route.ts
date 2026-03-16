import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { saveMapRecord } from "@/lib/persistence";
import type { TownMap } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = readSessionToken(
      cookieStore.get(SESSION_COOKIE_NAME)?.value,
    );

    if (!session) {
      return NextResponse.json(
        { error: "Sign in to save your maps." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Partial<TownMap>;

    if (!body.name) {
      return NextResponse.json(
        { error: "Map name is required." },
        { status: 400 },
      );
    }

    const payload = await saveMapRecord(
      {
        id: body.id ?? crypto.randomUUID(),
        name: body.name,
        width: body.width ?? 100,
        height: body.height ?? 100,
        tiles: body.tiles ?? [],
        placements: body.placements ?? [],
      },
      session.userId,
    );

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unable to save the map right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
