import { NextRequest, NextResponse } from "next/server";
import { isAdminRoute, isLocalOrCasaOSRequest } from "@/lib/admin-guard";
import { COOKIE_NAME, verifySessionToken } from "@/lib/jwt";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://flix-casa-pro-v2.vercel.app").split(",").map((value) => value.trim());

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin") || "";

  const isAdminLogin = pathname === "/api/admin/login" || pathname === "/admin/login";
  if (isAdminRoute(pathname) && !isAdminLogin) {
    let allowed = isLocalOrCasaOSRequest(request);
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!allowed && token) {
      // verify token and allow if root admin
      // note: verifySessionToken returns a promise
      const payload = await verifySessionToken(token);
      if (payload?.isRootAdmin) allowed = true;
    }

    if (!allowed) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key");
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
