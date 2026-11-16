import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";

import { VisionPage } from "@/components/research/VisionPage";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";

const description =
  "NEP-Ausbau übers Jahr: nationale Jahresspitze der Restlast, Markt vs. spitzenorientiert, Überschuss und Winter-Engpässe — 16.11.2025–15.11.2026, Stand 16.11.2026.";

export const metadata: Metadata = {
  title: "Vision · NEP übers Jahr",
  description,
  ...socialMeta({ title: "Vision · NEP übers Jahr", description, url: "/vision" }),
};

export const revalidate = 1800;

export default function VisionRoute() {
  const model = buildResearchVision();
  return <VisionPage model={model} />;
}
