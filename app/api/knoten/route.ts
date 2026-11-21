import { NextResponse } from "next/server";

import { loadKnotenCurve, parseKnotenSearch, resolveKnotenView } from "@/lib/knoten/knotenData.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw: Record<string, string | undefined> = {
    belegung: searchParams.get("belegung") ?? undefined,
    typ: searchParams.get("typ") ?? undefined,
    k: searchParams.get("k") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
  };
  const view = resolveKnotenView(parseKnotenSearch(raw));
  const curve = loadKnotenCurve(view.belegung, view.saison, view.typ, view.k, view.tag);

  return NextResponse.json(
    {
      belegung: view.belegung,
      typ: view.typ,
      k: view.k,
      tag: view.tag,
      row: view.row,
      curve,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
