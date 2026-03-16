import { NextResponse } from "next/server";

import { pokemonHelpers } from "@/data/pokemon-helpers";

export async function GET() {
  return NextResponse.json({ helpers: pokemonHelpers });
}
