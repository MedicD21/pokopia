import { NextResponse } from "next/server";

import { summarizeMaterials } from "@/lib/materials";
import type { BuildingData, VoxelBlock } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      building?: BuildingData;
      data?: BuildingData;
      blocks?: VoxelBlock[];
    };
    const blocks = body.blocks ?? body.building?.blocks ?? body.data?.blocks;

    if (!blocks) {
      return NextResponse.json(
        { error: "Expected blueprint blocks to generate materials." },
        { status: 400 },
      );
    }

    return NextResponse.json(summarizeMaterials(blocks));
  } catch {
    return NextResponse.json(
      { error: "Unable to generate materials right now." },
      { status: 500 },
    );
  }
}
