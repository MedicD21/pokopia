import { NextResponse } from "next/server";

import { listItemCatalog } from "@/lib/item-catalog";

export async function GET() {
  return NextResponse.json(await listItemCatalog());
}
