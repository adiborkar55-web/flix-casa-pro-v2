import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ source: null, experimentalDirectStreams: false }, { headers: { "Cache-Control": "no-store" } });
}
