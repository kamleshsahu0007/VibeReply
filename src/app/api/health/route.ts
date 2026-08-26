import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "vibereply",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
