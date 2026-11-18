import type { Metadata } from "next";

import { KnotenWorkbench } from "@/components/knoten/KnotenWorkbench.client";
import {
  loadKnotenCurve,
  loadKnotenManifest,
  parseKnotenSearch,
  resolveKnotenView,
} from "@/lib/knoten/knotenData.server";
import { knotenDateBounds } from "@/lib/knoten/knotenSaison";
import { socialMeta } from "@/lib/siteOg";

/** Curve payload is static on disk; query picks the slice per request. */
export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Modellknoten mit Grenze am Umspannwerk: Markt-Speicher nach Day-Ahead-Preis gegen knotentreu, drei Knotentypen, Stufen ×1–×10.";

export const metadata: Metadata = {
  title: "Knoten · Dein Modellknoten",
  description: DESCRIPTION,
  alternates: { canonical: "/knoten" },
  ...socialMeta({ title: "Knoten · Modellknoten", description: DESCRIPTION, url: "/knoten" }),
};

export default async function KnotenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const view = resolveKnotenView(parseKnotenSearch(raw));
  const curve = loadKnotenCurve(view.belegung, view.saison, view.typ, view.k, view.tag);
  const bounds = knotenDateBounds(loadKnotenManifest());

  return (
    <KnotenWorkbench
      belegung={view.belegung}
      typ={view.typ}
      k={view.k}
      tag={view.tag}
      row={view.row}
      curve={curve}
      bounds={bounds}
    />
  );
}