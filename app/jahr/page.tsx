import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";

import { VisionPage } from "@/components/research/VisionPage";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";

const description =
  "NEP-Ausbau übers Jahr: nationale Jahresspitze der Restlast, Markt vs. spitzenorientiert, Überschuss und Winter-Engpässe — 16.11.2025–15.11.2026, Stand 16.11.2026.";

const title = "Jahr · NEP übers Jahr";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/jahr" },
  ...socialMeta({ title, description, url: "/jahr" }),
};

export const revalidate = 1800;

export default function JahrRoute() {
  const model = buildResearchVision();
  return <VisionPage model={model} />;
}