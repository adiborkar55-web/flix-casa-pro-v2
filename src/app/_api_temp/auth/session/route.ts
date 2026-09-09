import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/jwt";
import { getAccount, touchSession } from "@/lib/server/account-store";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "No session" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const account = getAccount(payload.accountId);
  if (!account || account.isBlocked) {
    return NextResponse.json({ error: "Account blocked" }, { status: 403 });
  }

  touchSession(token);

  return NextResponse.json({
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      picture: account.picture,
      isRootAdmin: account.isRootAdmin,
    },
  });
}
