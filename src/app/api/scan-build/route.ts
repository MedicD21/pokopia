import { NextResponse } from "next/server";

import { createBlueprintFromUpload } from "@/lib/scan-blueprint";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Expected an uploaded image." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      createBlueprintFromUpload(image.name, image.size, image.type),
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to generate a blueprint from that upload." },
      { status: 500 },
    );
  }
}
