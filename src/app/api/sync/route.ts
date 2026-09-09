import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/jwt";

const syncStore = new Map<string, Partial<Record<"myList" | "watchHistory" | "profiles", unknown>>>();

async function accountFor(request: NextRequest) {
  const token = request.cookies.get("FLIXCASA_SESSION")?.value || request.cookies.get("FLIXCASA_USER_SESSION")?.value || request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function GET(request: NextRequest) {
  const payload = await accountFor(request);
  const accountId = new URL(request.url).searchParams.get("accountId");
  if (!payload || !accountId || payload.accountId !== accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(syncStore.get(accountId) || {});
}

export async function POST(request: NextRequest) {
  const payload = await accountFor(request);
  const body = await request.json() as { accountId?: unknown; collection?: unknown; value?: unknown };
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  const collection = body.collection;
  if (!payload || payload.accountId !== accountId || !["myList", "watchHistory", "profiles"].includes(String(collection))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const current = syncStore.get(accountId) || {};
  syncStore.set(accountId, { ...current, [collection as string]: body.value });
  return NextResponse.json({ synced: true });
}