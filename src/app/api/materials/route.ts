import { NextResponse } from "next/server";

import { blockMaterials } from "@/data/materials";

export async function GET() {
  return NextResponse.json({ materials: blockMaterials });
}
