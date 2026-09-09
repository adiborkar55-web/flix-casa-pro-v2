import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/jwt";

const challenges = new Map<string, { expiresAt: number; token?: string }>();

function purge() {
  const now = Date.now();
  for (const [id, challenge] of challenges) if (challenge.expiresAt < now) challenges.delete(id);
}

export async function GET(request: Request) {
  purge();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const challenge = challenges.get(id);
    if (!challenge || challenge.expiresAt < Date.now()) return NextResponse.json({ authorized: false }, { status: 410 });
    if (!challenge.token) return NextResponse.json({ authorized: false });
    const response = NextResponse.json({ authorized: true });
    response.cookies.set("FLIXCASA_USER_SESSION", challenge.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 10 * 365 * 24 * 60 * 60, path: "/" });
    response.cookies.set(COOKIE_NAME, challenge.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 7 * 24 * 60 * 60, path: "/" });
    challenges.delete(id);
    return response;
  }
  const challengeId = randomBytes(18).toString("base64url");
  challenges.set(challengeId, { expiresAt: Date.now() + 2 * 60 * 1000 });
  return NextResponse.json({ id: challengeId, expiresAt: Date.now() + 2 * 60 * 1000 });
}

export async function POST(request: Request) {
  purge();
  const sourceToken = request.headers.get("x-session-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookieToken = request.headers.get("cookie")?.match(/(?:^|;\s*)FLIXCASA_USER_SESSION=([^;]+)/)?.[1];
  const token = sourceToken || cookieToken;
  const payload = token ? await verifySessionToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Sign in on the mobile device first." }, { status: 401 });
  const body = await request.json() as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  const challenge = challenges.get(id);
  if (!challenge || challenge.expiresAt < Date.now()) return NextResponse.json({ error: "QR code expired." }, { status: 410 });
  challenge.token = token;
  return NextResponse.json({ linked: true });
}