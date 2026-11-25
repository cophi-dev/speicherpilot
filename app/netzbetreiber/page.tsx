import type { Metadata } from "next";

import { NetzbetreiberResearchPage } from "@/components/bess-netzbetreiber/NetzbetreiberResearchPage";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  loadBundeslaenderGeoJson,
  loadKarte3dSummary,
} from "@/lib/bessKarte3d/loadSummary.server";
import {
  bessNetzbetreiberManifest,
  loadBessNetzbetreiberBundle,
} from "@/lib/bessNetzbetreiber/loadBessNetzbetreiber.server";
import { datasetJsonLd } from "@/lib/seo/jsonLd";
import { socialMeta } from "@/lib/siteOg";

const title = "BESS je Netzbetreiber · 3D-Speicherkarte und Verteilnetze";
const description =
  "Großspeicher ≥1 MW (Nettonennleistung) in Betrieb: interaktive 3D-Speicherkarte 2018–heute aus dem MaStR, Konzernanteil E.ON, Ranking der Verteilnetzbetreiber — ohne Euro-Zahlen.";

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
        model={model}
        karteSummary={karteSummary}
        geoJson={geoJson}
      />
    </>
  );
}
