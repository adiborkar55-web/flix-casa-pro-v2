import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/jwt";
import { getAccount, touchSession } from "@/lib/server/account-store";
import { getInstanceState } from "@/lib/server/instance-store";

export async function GET(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = bearer || request.cookies.get("FLIXCASA_SESSION")?.value || request.cookies.get("FLIXCASA_USER_SESSION")?.value || request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "No session" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const account = getAccount(payload.accountId);
  if (account?.isBlocked) {
    return NextResponse.json({ error: "Account blocked" }, { status: 403 });
  }
  const instanceUser = (await getInstanceState(request.headers.get("x-app-instance"))).users.find((user) => user.id === payload.accountId);
  if (instanceUser?.blocked) return NextResponse.json({ error: "Access blocked for this app instance" }, { status: 403 });

  if (account) touchSession(token);
  const sessionAccount = account || {
    id: payload.accountId,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture,
    isRootAdmin: payload.isRootAdmin,
  };

  return NextResponse.json({
    account: {
      id: sessionAccount.id,
      email: sessionAccount.email,
      name: sessionAccount.name,
      picture: sessionAccount.picture,
      isRootAdmin: sessionAccount.isRootAdmin,
    },
  });
}
