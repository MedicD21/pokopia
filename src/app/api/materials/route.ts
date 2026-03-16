import { NextResponse } from "next/server";

import { listMaterialCatalog } from "@/lib/material-catalog";

export async function GET() {
  const catalog = await listMaterialCatalog();

  return NextResponse.json(catalog);
}
