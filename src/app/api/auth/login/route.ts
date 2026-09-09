import { NextRequest, NextResponse } from "next/server";
import { sanitizeEmail, sanitizeInput } from "@/lib/sanitize";
import { createSessionToken, COOKIE_NAME } from "@/lib/jwt";
import { getOrCreateAccount, hasAccountPassword, isIpBlocked, registerSession, setAccountPassword, verifyAccountPassword } from "@/lib/server/account-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { registerInstanceUser } from "@/lib/server/instance-store";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isIpBlocked(ip)) return NextResponse.json({ error: "Access blocked" }, { status: 403 });
  const { allowed } = rateLimit(ip, "auth-login");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await request.json();
  const mode = body.mode === "signup" ? "signup" : "login";
  const email = sanitizeEmail(body.email);
  const name = sanitizeInput(body.name);
  const password = typeof body.password === "string" ? body.password : "";
  const picture = body.picture ? sanitizeInput(body.picture) : undefined;

  if (!email || (mode === "signup" && !name) || password.length < 8) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  if (mode === "signup") {
    if (hasAccountPassword(email)) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    setAccountPassword(email, password);
  } else if (!verifyAccountPassword(email, password)) {
    return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
  }

  const account = getOrCreateAccount(email, name || email.split("@")[0], picture);
  if (account.isBlocked) {
    return NextResponse.json({ error: "Account blocked" }, { status: 403 });
  }

  const token = await createSessionToken({
    accountId: account.id,
    email: account.email,
    name: account.name,
    picture: account.picture,
    isRootAdmin: account.isRootAdmin,
  });

  const ua = request.headers.get("user-agent") || undefined;
  registerSession(token, account.id, ip, ua);
  await registerInstanceUser(request.headers.get("x-app-instance"), { id: account.id, name: account.name, email: account.email, appVersion: request.headers.get("x-app-version") || "unknown", ip, userAgent: ua });

  const response = NextResponse.json({
    success: true,
    token,
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      picture: account.picture,
      isRootAdmin: account.isRootAdmin,
    },
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  response.cookies.set("FLIXCASA_USER_SESSION", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 10 * 365 * 24 * 60 * 60,
    path: "/",
  });
  response.cookies.set("FLIXCASA_SESSION", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 10 * 365 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
