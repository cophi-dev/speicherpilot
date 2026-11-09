import { Suspense } from "react";

import { MonatPageV4 } from "@/components/home/MonatPageV4";
import { NationalFleetMonatSlot } from "@/components/home/NationalFleetMonatSlot";
import { NationalFleetMonthUnavailable } from "@/components/home/NationalFleetMonthUnavailable";
import { MonatUnavailable } from "@/components/home/MonatUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildMonatGrid,
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
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { marktInsightsForRoute } from "@/lib/marktInsightsPage.server";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ monat: string }> }) {
  const { monat } = await params;
  return {
    title: `Monat · ${monat}`,
    description: "Monatsverlauf in der geladenen Tagesreihe: Überschuss-Graph und Sprung zu einzelnen Tagen.",
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

  const fleetFactor = parseFleetFactor(query.faktor);
  const fleetStrategy = parseFleetStrategy(query.fahrweise);
  const grid = buildMonatGrid({
    monthKey: monat,
    records,
    todayKey: pageData.todayKey,
    lastCompleteDayKey: pageData.lastCompleteDayKey,
  });
  const bars = barsFromMonatGrid(grid);

  const pointe = monatPointe(monat, records);
  const seriesLine = pointe.footnote.replace(MONAT_SURPLUS_EXPLAIN_DE, "").trim();
  const liveFleet = await loadLargeBatteryFleet();
  const marktInsights = marktInsightsForRoute({
    route: "monat",
    records,
    fleetPowerGw: liveFleet?.powerGw ?? 4.64,
    fleetEnergyGwh: liveFleet?.energyGwh ?? 8.14,
    monthKey: monat,
  });

  const fleetSlot = nationalFleetMonthAvailable(monat) ? (
    <NationalFleetMonatSlot
      monthKey={monat}
      factor={fleetFactor}
      strategy={fleetStrategy}
      bars={bars}
      surplusLine={pointe.subline}
      seriesLine={seriesLine}
      marktInsights={marktInsights}
    />
  ) : (
    <NationalFleetMonthUnavailable monthKey={monat} />
  );

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[720px] max-w-[1200px]" />}>
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
      >
        {fleetSlot}
      </MonatPageV4>
    </Suspense>
  );
}
