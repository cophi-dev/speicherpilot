import { Suspense } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import { datasetJsonLd } from "@/lib/seo/jsonLd";
import { monatDocumentTitle, monatPageDescription } from "@/lib/seo/pageTitles";
import { socialMeta } from "@/lib/siteOg";

import { MonatPageV4 } from "@/components/home/MonatPageV4";
import { NationalFleetMonatSlot } from "@/components/home/NationalFleetMonatSlot";
import { MonatObservedOnlySlot } from "@/components/home/MonatObservedOnlySlot";
import { MonatUnavailable } from "@/components/home/MonatUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildMonatGrid,
  daysInBerlinMonth,
  isBerlinMonthKey,
  MONAT_SURPLUS_EXPLAIN_DE,
  monatPointe,
  monthHasAnyRecord,
} from "@/lib/monatCalendar";
import { loadMonatPageData } from "@/lib/monatPageData.server";
import {
  nationalFleetMonthAvailable,
  parseFleetFactor,
  parseFleetStrategy,
} from "@/lib/nationalMonthFleetModel";
import { barsFromMonatGrid } from "@/lib/monatSurplusBars";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";
/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ monat: string }> }) {
  const { monat } = await params;
  const fleetMonth = nationalFleetMonthAvailable(monat);
  const title = monatDocumentTitle(monat, fleetMonth);
  const description = monatPageDescription(fleetMonth);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/monat/${monat}` },
    ...socialMeta({ title, description, url: `/monat/${monat}` }),
  };
}

export default async function MonatDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ monat: string }>;
  searchParams: Promise<{ faktor?: string; fahrweise?: string }>;
}) {
  const { monat } = await params;
  const query = await searchParams;
  const fleetMonthOpen = nationalFleetMonthAvailable(monat);
  if (!isBerlinMonthKey(monat)) {
    const pageData = await loadMonatPageData(monat);
    return (
      <MonatUnavailable
        requestedMonth={monat}
        records={pageData.records}
        lastCompleteDayKey={pageData.lastCompleteDayKey}
      />
    );
  }

  const pageData = await loadMonatPageData(monat);
  const records = pageData.records;

  if (!monthHasAnyRecord(monat, records) && !nationalFleetMonthAvailable(monat)) {
    return (
      <MonatUnavailable
        requestedMonth={monat}
        records={records}
        lastCompleteDayKey={pageData.lastCompleteDayKey}
      />
    );
  }

  const fleetFactor =
    query.faktor !== undefined ? parseFleetFactor(query.faktor) : fleetMonthOpen ? 10 : parseFleetFactor(undefined);
  const fleetStrategy =
    query.fahrweise !== undefined
      ? parseFleetStrategy(query.fahrweise)
      : fleetMonthOpen
        ? "spitze"
        : parseFleetStrategy(undefined);
  const grid = buildMonatGrid({
    monthKey: monat,
    records,
    todayKey: pageData.todayKey,
    lastCompleteDayKey: pageData.lastCompleteDayKey,
  });
  const bars = barsFromMonatGrid(grid);

  const pointe = monatPointe(monat, records, pageData.todayKey);
  const seriesLine = pointe.footnote.replace(MONAT_SURPLUS_EXPLAIN_DE, "").trim();
  const fleetSlot = nationalFleetMonthAvailable(monat) ? (
    <NationalFleetMonatSlot monthKey={monat} factor={fleetFactor} strategy={fleetStrategy} />
  ) : (
    <MonatObservedOnlySlot monthKey={monat} />
  );

  const monthDays = daysInBerlinMonth(monat);
  const monatDataset = datasetJsonLd({
    path: `/monat/${monat}`,
    name: monatDocumentTitle(monat, fleetMonthOpen),
    description: monatPageDescription(fleetMonthOpen),
    temporalCoverage: `${monthDays[0]}/${monthDays[monthDays.length - 1]}`,
    includeNep: fleetMonthOpen,
  });

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[720px] max-w-[1200px]" />}>
      <JsonLd data={{ "@context": "https://schema.org", ...monatDataset }} />
      <MonatPageV4
        monthKey={monat}
        todayKey={pageData.todayKey}
        lastCompleteDayKey={pageData.lastCompleteDayKey}
        records={records}
        dataStand={pageData.dataStand}
        fleetFactor={fleetFactor}
        fleetStrategy={fleetStrategy}
        observationLive={pageData.observationLive}
        observationFallbackNote={pageData.observationFallback?.sourceNoteDe ?? null}
        surplusBars={bars}
        kompromissTeaser={fleetMonthOpen ? loadEps70Teaser() : null}
      >
        {fleetSlot}
      </MonatPageV4>
    </Suspense>
  );
}
