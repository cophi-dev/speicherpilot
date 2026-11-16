import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 86400;

const COMPACT_PATH = join(process.cwd(), "data/national-fleet/2026-10/fleet-month-compact.json");

export async function GET() {
  const body = readFileSync(COMPACT_PATH);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}