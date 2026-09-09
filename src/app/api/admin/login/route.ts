import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { COOKIE_NAME, createSessionToken } from "@/lib/jwt";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function POST(request: Request) {
  const { allowed } = rateLimit(getClientIp(request), "admin-login");
  if (!allowed) return NextResponse.json({ error: "Too many login attempts." }, { status: 429 });
  const configuredEmail = (process.env.ADMIN_EMAIL || "borkaraditya120@gmail.com").trim();
  const configuredPassword = process.env.ADMIN_PASSWORD || "AadityaBorkar99099.@#@";
  if (!configuredEmail || !configuredPassword) {
    return NextResponse.json({ error: "Admin credentials are not configured on the server." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (safeEqual(email.toLowerCase(), configuredEmail.toLowerCase()) && safeEqual(password, configuredPassword)) {
      const token = await createSessionToken({ accountId: "admin-portal", email: configuredEmail, isRootAdmin: true }, "10y");
      const response = NextResponse.json({ authenticated: true });
      response.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 10 * 365 * 24 * 60 * 60, path: "/" });
      return response;
    }
  } catch {
    // Return the same generic failure as invalid credentials.
  }

  return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
}
