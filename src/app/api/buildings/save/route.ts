import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { saveBuildingRecord } from "@/lib/persistence";
import type { BuildingData } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = readSessionToken(
      cookieStore.get(SESSION_COOKIE_NAME)?.value,
    );

    if (!session) {
      return NextResponse.json(
        { error: "Sign in to save your builds." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      id?: string;
      name?: string;
      description?: string;
      data?: BuildingData;
    };

    if (!body.data?.blocks) {
      return NextResponse.json(
        { error: "Expected a building blueprint payload." },
        { status: 400 },
      );
    }

    const name = body.name?.trim() || body.data.name || "Untitled Build";
    const description =
      body.description?.trim() ||
      body.data.description ||
      "Saved from the Pokopia planner builder.";

    const payload = await saveBuildingRecord({
      id: body.id,
      ownerId: session.userId,
      name,
      description,
      data: body.data,
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unable to save the building right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
