import { NextResponse } from "next/server";

import { upsertSavedBuilding } from "@/lib/demo-storage";
import type { BuildingData } from "@/lib/types";

export async function POST(request: Request) {
  try {
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

    const id = body.id ?? body.data.id ?? crypto.randomUUID();
    const name = body.name?.trim() || body.data.name || "Untitled Build";
    const description =
      body.description?.trim() ||
      body.data.description ||
      "Saved from the Pokopia planner builder.";
    const record = await upsertSavedBuilding({
      id,
      name,
      description,
      data: {
        ...body.data,
        id,
        name,
        description,
      },
    });

    return NextResponse.json({ building: record }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to save the building right now." },
      { status: 500 },
    );
  }
}
