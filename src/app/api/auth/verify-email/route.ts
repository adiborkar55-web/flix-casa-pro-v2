import { promises as dns } from "node:dns";
import { NextResponse } from "next/server";
import { sanitizeEmail } from "@/lib/sanitize";
import { hasAccountPassword } from "@/lib/server/account-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: unknown };
    const email = sanitizeEmail(typeof body.email === "string" ? body.email : "");
    if (!email || hasAccountPassword(email)) return NextResponse.json({ valid: false, registered: Boolean(email && hasAccountPassword(email)), error: hasAccountPassword(email) ? "This Google account is already registered. Please log in." : "This Google account is invalid or does not exist." }, { status: hasAccountPassword(email) ? 409 : 400 });
    const domain = email.split("@")[1];
    const records = await dns.resolveMx(domain);
    return NextResponse.json({ valid: records.length > 0, email });
  } catch {
    return NextResponse.json({ valid: false, error: "This Google account is invalid or does not exist." }, { status: 400 });
  }
}