import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { sanitizeEmail } from "@/lib/sanitize";
import { issuePasswordReset, resetAccountPassword, verifyPasswordReset } from "@/lib/server/account-store";

export const runtime = "nodejs";

async function sendOtp(email: string, code: string) {
  const endpoint = process.env.RESET_EMAIL_API?.trim();
  if (!endpoint) return false;
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: process.env.RESET_EMAIL_API_KEY ? `Bearer ${process.env.RESET_EMAIL_API_KEY}` : "" }, body: JSON.stringify({ to: email, subject: "FlixCasa password reset code", code }) });
  return response.ok;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; email?: unknown; code?: unknown; password?: unknown };
    const email = sanitizeEmail(typeof body.email === "string" ? body.email : "");
    const action = body.action || "request";
    if (!email) return NextResponse.json({ error: "Enter a valid Google email." }, { status: 400 });
    if (action === "request") {
      const code = `${randomInt(100000, 999999)}`;
      if (!issuePasswordReset(email, code)) return NextResponse.json({ error: "This Google account is invalid or does not exist." }, { status: 404 });
      const delivered = await sendOtp(email, code);
      if (!delivered) return NextResponse.json({ error: "Password reset email service is not configured." }, { status: 503 });
      return NextResponse.json({ sent: true });
    }
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (action === "verify") return NextResponse.json({ verified: verifyPasswordReset(email, code) }, { status: verifyPasswordReset(email, code) ? 200 : 400 });
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8 || !resetAccountPassword(email, code, password)) return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    return NextResponse.json({ reset: true });
  } catch {
    return NextResponse.json({ error: "Unable to process password reset." }, { status: 400 });
  }
}