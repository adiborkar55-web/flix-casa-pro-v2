import { NextResponse } from "next/server";
import { getControlConfig } from "@/lib/server/control-store";

export async function GET() {
  const controls = await getControlConfig();
  return NextResponse.json({ sources: controls.sources, catalog: controls.catalog, updatedAt: controls.updatedAt }, { headers: { "Cache-Control": "no-store" } });
}