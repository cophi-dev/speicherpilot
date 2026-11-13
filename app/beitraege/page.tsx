import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";

import { BeitraegePage } from "@/components/beitraege/BeitraegePage";
import { getBlogPosts } from "@/content/blog/posts";
import { marktInsightsForRoute } from "@/lib/marktInsightsPage.server";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";

const description = "Artikel zu Großspeichern und kuratierte externe Meldungen.";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Beiträge",
  description,
  alternates: { canonical: "/beitraege" },
  ...socialMeta({ title: "Beiträge", description, url: "/beitraege" }),
};

export default async function BeitraegeIndexPage() {
  const snap = loadTagRollSnapshot();
  const marktInsights = marktInsightsForRoute({
    route: "beitraege",
    records: snap.records,
    fleetPowerGw: snap.fleet.powerGw,
    fleetEnergyGwh: snap.fleet.energyGwh,
  });

  return <BeitraegePage posts={getBlogPosts()} marktInsights={marktInsights} />;
}
