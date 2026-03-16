import { NextResponse } from "next/server";

import { saveMapRecord } from "@/lib/demo-storage";
import type { TownMap } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<TownMap>;

    if (!body.name) {
      return NextResponse.json({ error: "Map name is required." }, { status: 400 });
    }

    const map = await saveMapRecord({
      id: body.id ?? crypto.randomUUID(),
      name: body.name,
      width: body.width ?? 100,
      height: body.height ?? 100,
      tiles: body.tiles ?? [],
      placements: body.placements ?? [],
    });

    return NextResponse.json({ map }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to save the map right now." },
      { status: 500 },
    );
  }
}
