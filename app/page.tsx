import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Tagesvorlage } from "@/components/home/Tagesvorlage";
import { JsonLd } from "@/components/seo/JsonLd";
import { Skeleton } from "@/components/ui/skeleton";
import { datasetJsonLd } from "@/lib/seo/jsonLd";
import { HOME_DOCUMENT_TITLE } from "@/lib/seo/pageTitles";
import { tagDocumentTitle, tagPageDescription } from "@/lib/seo/pageTitles";
import { loadCompleteTagPageModel } from "@/lib/tagPageProps.server";
import { resolveNavShortcuts } from "@/lib/navShortcuts.server";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ faktor?: string | string[]; fahrweise?: string }>;
}) {
  const query = await searchParams;
  const { lastCompleteDayKey } = await resolveNavShortcuts();
  const faktor = typeof query.faktor === "string" ? query.faktor : undefined;
  const fahrweise = typeof query.fahrweise === "string" ? query.fahrweise : undefined;

  const model = await loadCompleteTagPageModel(
    lastCompleteDayKey,
    { faktor, fahrweise },
    { isStartSurface: true },
  );

  if (model === "redirect") {
    redirect(`/tag/${lastCompleteDayKey}`);
  }

  if (model === "unavailable") {
    return null;
  }

  const snap = loadTagRollSnapshot();
  const homeDataset = datasetJsonLd({
    path: "/",
    name: HOME_DOCUMENT_TITLE,
    description: SITE_DESCRIPTION,
    temporalCoverage: `${snap.coverageStart}/${snap.coverageEnd}`,
    includeNep: true,
  });
  const dayTitle = tagDocumentTitle(model.dayKey, false);
  const dayDescription = tagPageDescription(model.dayKey, false);

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[920px] max-w-[1200px]" />}>
      <JsonLd data={{ "@context": "https://schema.org", ...homeDataset }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          ...datasetJsonLd({
            path: `/tag/${model.dayKey}`,
            name: dayTitle,
            description: dayDescription,
            temporalCoverage: model.dayKey,
          }),
        }}
      />
      <Tagesvorlage model={model} />
    </Suspense>
  );
}