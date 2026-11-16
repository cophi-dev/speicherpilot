import type { Metadata } from "next";

import { VisionPage } from "@/components/research/VisionPage";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";
import { buildVisionJahrKernsatz } from "@/lib/research/visionJahrKernsatz";
import { JsonLd } from "@/components/seo/JsonLd";
import { datasetJsonLd } from "@/lib/seo/jsonLd";
import { socialMeta } from "@/lib/siteOg";

const TITLE = "NEP-Batteriespeicher: Wie stark sie die Restlastspitze senken (Jahresrechnung) | SpeicherPilot";

function visionMetadata(): { kernsatz: ReturnType<typeof buildVisionJahrKernsatz>; description: string } {
  const kernsatz = buildVisionJahrKernsatz();
  return { kernsatz, description: kernsatz.descriptionShort };
}

const { description } = visionMetadata();

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description,
  alternates: { canonical: "/vision" },
  ...socialMeta({ title: TITLE, description, url: "/vision" }),
};

export const revalidate = 1800;

export default function VisionRoute() {
  const model = buildResearchVision();
  const kernsatz = buildVisionJahrKernsatz();

  const dataset = datasetJsonLd({
    path: "/vision",
    name: TITLE.replace(/\s*\|\s*SpeicherPilot$/, ""),
    description: kernsatz.descriptionShort,
    temporalCoverage: "2025-11-16/2026-11-15",
    includeNep: true,
  });

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...dataset }} />
      <VisionPage model={model} kernsatz={kernsatz.paragraph} />
    </>
  );
}