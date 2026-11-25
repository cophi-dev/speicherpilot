import type { Metadata } from "next";

import { NetzbetreiberResearchPage } from "@/components/bess-netzbetreiber/NetzbetreiberResearchPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { loadBessNetzbetreiberBundle, bessNetzbetreiberManifest } from "@/lib/bessNetzbetreiber/loadBessNetzbetreiber.server";
import { datasetJsonLd } from "@/lib/seo/jsonLd";
import { socialMeta } from "@/lib/siteOg";

const title = "BESS je Netzbetreiber · Bestand und Verteilnetze";
const description =
  "Großspeicher ≥1 MW in Betrieb: Modell aus MaStR, Konzernanteil E.ON, Punktekarte Deutschland, Ranking der Verteilnetzbetreiber — ohne Euro-Zahlen.";

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
  const stichtag = String(manifest.stichtagMastr ?? "2026-11-24");

  const dataset = datasetJsonLd({
    path: "/netzbetreiber",
    name: title,
    description,
    temporalCoverage: stichtag,
  });

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...dataset }} />
      <NetzbetreiberResearchPage model={model} />
    </>
  );
}