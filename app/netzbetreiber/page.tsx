import type { Metadata } from "next";

import {
  type NetzbetreiberClientDaten,
  NetzbetreiberResearchPage,
} from "@/components/bess-netzbetreiber/NetzbetreiberResearchPage";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  loadBundeslaenderGeoJson,
  loadKarte3dKernzahlen,
  loadKarte3dSummary,
} from "@/lib/bessKarte3d/loadSummary.server";
import {
  bessNetzbetreiberManifest,
  loadBessNetzbetreiberBundle,
} from "@/lib/bessNetzbetreiber/loadBessNetzbetreiber.server";
import { datasetJsonLd } from "@/lib/seo/jsonLd";
import { socialMeta } from "@/lib/siteOg";

const title = "BESS-Karte · Batteriespeicher ab 1 MW in Deutschland";
const description =
  "Batteriespeicher ab 1 MW in Deutschland: interaktive 3D-Karte aus dem Marktstammdatenregister, mit Konzentration, Zubau und EE-Redispatch je Land.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/netzbetreiber" },
  ...socialMeta({ title, description, url: "/netzbetreiber" }),
};

export const revalidate = 86400;

export default function NetzbetreiberPage() {
  const model = loadBessNetzbetreiberBundle();
  const manifest = bessNetzbetreiberManifest();
  // Nur die nötigen Felder an den Client, nicht das ganze bundle.json (speicherpilot 25.11 14:42).
  const nb: NetzbetreiberClientDaten = {
    stichtagMastr: typeof manifest.stichtagMastr === "string" ? manifest.stichtagMastr : null,
    uenbEbene: {
      inBetriebBruttoGw: model.uenbEbene.inBetriebBruttoGw,
      inBetriebNettoGw: model.uenbEbene.inBetriebNettoGw ?? null,
    },
  };
  const karteSummary = loadKarte3dSummary();
  const geoJson = loadBundeslaenderGeoJson();
  const stichtag = String(karteSummary.meta.stichtag ?? manifest.stichtagMastr ?? "2026-11-24");

  const dataset = datasetJsonLd({
    path: "/netzbetreiber",
    name: title,
    description,
    temporalCoverage: stichtag,
  });

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...dataset }} />
      <NetzbetreiberResearchPage
        nb={nb}
        karteSummary={karteSummary}
        geoJson={geoJson}
        kern={loadKarte3dKernzahlen()}
      />
    </>
  );
}
