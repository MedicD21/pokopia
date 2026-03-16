import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
