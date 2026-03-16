import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  readSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = readSessionToken(token);

  if (!session) {
    return NextResponse.json({ user: null });
  }

  if (!prisma) {
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
      },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      const response = NextResponse.json({ user: null });
      cookieStore.set(SESSION_COOKIE_NAME, "", {
        ...sessionCookieOptions,
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
