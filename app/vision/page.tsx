import type { Metadata } from "next";

import { VisionPage } from "@/components/research/VisionPage";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";

const description =
  "Nationales Modell im Monatshorizont: wie Gigawatt-Leistung und Speicherdauer die modellierte Senkung der Residuallast in NEP-Stufen verändern — mit Schätzmodus und Kurven.";

export const metadata: Metadata = {
  title: "Vision",
  description,
  openGraph: {
    title: "Vision",
    description,
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Vision",
    description,
    images: [],
  },
};

export const revalidate = 1800;

export default function VisionRoute() {
  const model = buildResearchVision();
  return <VisionPage model={model} />;
}
