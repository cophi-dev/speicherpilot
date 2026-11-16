import type { Metadata } from "next";

import { ResearchHomePage } from "@/components/research/ResearchHomePage";
import { JsonLd } from "@/components/seo/JsonLd";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { datasetJsonLd } from "@/lib/seo/jsonLd";
import { HOME_DOCUMENT_TITLE } from "@/lib/seo/pageTitles";
import { buildResearchHome } from "@/lib/research/loadResearchHome.server";
import { loadResearchDays } from "@/lib/research/loadResearchDays.server";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";
import { formatQuantity } from "@/lib/formatQuantity";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";
import { SITE_DESCRIPTION, socialMeta } from "@/lib/siteOg";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export const metadata: Metadata = {
  title: { absolute: HOME_DOCUMENT_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  ...socialMeta({
    title: HOME_DOCUMENT_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
  }),
};

export default async function Home() {
  const now = new Date();
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const days = await loadResearchDays(now);
  const model = buildResearchHome(days, todayKey);
  if (!model) {
    return null;
  }
  const snap = loadTagRollSnapshot();
  const teaser = loadEps70Teaser();
  const liveFleetLabel = snap?.fleet
    ? `${formatQuantity(snap.fleet.powerGw, "de", 2)} GW / ${formatQuantity(snap.fleet.energyGwh, "de", 2)} GWh`
    : null;
  const homeDataset = datasetJsonLd({
    path: "/",
    name: HOME_DOCUMENT_TITLE,
    description: SITE_DESCRIPTION,
    temporalCoverage: `${snap.coverageStart}/${snap.coverageEnd}`,
    includeNep: true,
  });
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...homeDataset }} />
      <ResearchHomePage model={model} simulatorTeaser={teaser} liveFleetLabel={liveFleetLabel} />
    </>
  );
}