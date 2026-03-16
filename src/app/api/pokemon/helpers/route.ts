import { NextResponse } from "next/server";

import { pokemonHelpers } from "@/data/pokemon-helpers";
import { prisma } from "@/lib/db";

export async function GET() {
  if (prisma) {
    try {
      const helpers = await prisma.pokemonHelper.findMany({
        orderBy: [{ buildSkill: "asc" }, { pokemonName: "asc" }],
      });

      return NextResponse.json({ helpers });
    } catch {
      // Fall back to static data below.
    }
  }

  return NextResponse.json({ helpers: pokemonHelpers });
}
