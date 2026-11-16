import type { Metadata } from "next";

import { VisionPage } from "@/components/research/VisionPage";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";
import { buildVisionJahrKernsatz } from "@/lib/research/visionJahrKernsatz";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";
import { socialMeta } from "@/lib/siteOg";

const TITLE = "NEP-Batteriespeicher: Wie stark sie die Restlastspitze senken (Jahresrechnung) | SpeicherPilot";

function visionMetadata(): { kernsatz: ReturnType<typeof buildVisionJahrKernsatz>; description: string } {
  const kernsatz = buildVisionJahrKernsatz();
  return { kernsatz, description: kernsatz.descriptionShort };
}

const { kernsatz: kernsatzForMeta, description } = visionMetadata();

export const metadata: Metadata = {
  title: TITLE,
  description,
  ...socialMeta({ title: TITLE, description, url: "/vision" }),
};

export const revalidate = 1800;

export default function VisionRoute() {
  const model = buildResearchVision();
  const kernsatz = buildVisionJahrKernsatz();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: TITLE.replace(/\s*\|\s*SpeicherPilot$/, ""),
    description: kernsatz.descriptionShort,
    temporalCoverage: "2025-11-16/2026-11-15",
    spatialCoverage: {
      "@type": "Place",
      name: "Deutschland",
    },
    creator: {
      "@type": "Person",
      name: "Phillipp Zarindast",
    },
    isAccessibleForFree: true,
    url: `${getPublicSiteOrigin()}/vision`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <VisionPage model={model} kernsatz={kernsatz.paragraph} />
    </>
  );
}