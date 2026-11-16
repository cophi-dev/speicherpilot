import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";

import { BeitraegePage } from "@/components/beitraege/BeitraegePage";
import { getBlogPosts } from "@/content/blog/posts";
import { loadBeitraegeMarktInsights } from "@/lib/beitraegeKontext.server";

const description =
  "Artikel zu Großspeichern und kuratierte externe Meldungen mit Einordnung — geprüft an der Primärquelle.";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Beiträge",
  description,
  alternates: { canonical: "/beitraege" },
  ...socialMeta({ title: "Beiträge", description, url: "/beitraege" }),
};

export default async function BeitraegeIndexPage() {
  const { marktInsights } = await loadBeitraegeMarktInsights();

  return <BeitraegePage posts={getBlogPosts()} marktInsights={marktInsights} />;
}