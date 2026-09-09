import { NextResponse } from "next/server";
import { sanitizeEmail, sanitizeInput } from "@/lib/sanitize";
import { createSessionToken, COOKIE_NAME } from "@/lib/jwt";
import { getOrCreateAccount, registerSession } from "@/lib/server/account-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
export async function POST(request) {
    const ip = getClientIp(request);
    const { allowed } = rateLimit(ip, "auth-login");
    if (!allowed)
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    const body = await request.json();
    const email = sanitizeEmail(body.email);
    const name = sanitizeInput(body.name);
    const picture = body.picture ? sanitizeInput(body.picture) : undefined;
    if (!email || !name)
        return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    const account = getOrCreateAccount(email, name, picture);
    if (account.isBlocked)
        return NextResponse.json({ error: "Account blocked" }, { status: 403 });
    const token = await createSessionToken({ accountId: account.id, email: account.email, isRootAdmin: account.isRootAdmin });
    registerSession(token, account.id, ip, request.headers.get("user-agent") || undefined);
    const response = NextResponse.json({
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
    return response;
}
