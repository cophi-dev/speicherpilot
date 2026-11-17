import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400;

import { nationalFleetMonthAvailable } from "@/lib/nationalMonthFleetModel";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const monthKey = url.searchParams.get("month") ?? "2026-10";
  if (!nationalFleetMonthAvailable(monthKey)) {
    return new NextResponse("Monat nicht verfügbar", { status: 404 });
  }
  const compactPath = join(process.cwd(), "data/national-fleet", monthKey, "fleet-month-compact.json");
  const body = readFileSync(compactPath);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}