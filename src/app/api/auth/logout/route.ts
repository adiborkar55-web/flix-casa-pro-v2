import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/jwt";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, maxAge: 0, path: "/" });
  response.cookies.set("FLIXCASA_USER_SESSION", "", { httpOnly: true, maxAge: 0, path: "/" });
  response.cookies.set("FLIXCASA_SESSION", "", { maxAge: 0, path: "/" });
  return response;
}
