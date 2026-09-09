import { NextRequest } from "next/server";
import { POST as login } from "@/app/api/auth/login/route";

export async function POST(request: NextRequest) {
  const body = await request.json();
  return login(new NextRequest(new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify({ ...body, mode: "signup" }) })));
}