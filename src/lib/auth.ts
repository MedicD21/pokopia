import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "pokopia_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = {
  userId: string;
  email: string;
  name: string | null;
  exp: number;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSessionSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "pokopia-dev-session-secret"
  );
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createSessionToken(input: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const payload: SessionUser = {
    userId: input.userId,
    email: input.email,
    name: input.name ?? null,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function readSessionToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionUser;

    if (!payload.userId || !payload.email || !payload.exp) {
      return null;
    }

    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
