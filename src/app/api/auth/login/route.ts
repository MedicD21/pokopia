import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; name?: string };
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();

    if (!email || !email.includes("@") || email.length > 120) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 },
      );
    }

    if (!prisma) {
      return NextResponse.json(
        { error: "Account sign-in requires a configured database connection." },
        { status: 500 },
      );
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
      },
      create: {
        email,
        name: name || null,
      },
    });

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);

    return response;
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Unable to sign in right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
