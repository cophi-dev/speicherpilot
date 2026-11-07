import { Suspense } from "react";

import { MonatPageV4 } from "@/components/home/MonatPageV4";
import { NationalFleetMonatSlot } from "@/components/home/NationalFleetMonatSlot";
import { NationalFleetMonthUnavailable } from "@/components/home/NationalFleetMonthUnavailable";
import { MonatUnavailable } from "@/components/home/MonatUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMonatGrid, isBerlinMonthKey, monthHasAnyRecord } from "@/lib/monatCalendar";
import { loadGermanyView } from "@/lib/germanyView";
import {
  nationalFleetMonthAvailable,
  parseFleetFactor,
  parseFleetStrategy,
} from "@/lib/nationalMonthFleetModel";
import { barsFromMonatGrid } from "@/lib/monatSurplusBars";

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
    const view = await loadGermanyView(new Date(), "/monat", {});
    return (
      <MonatUnavailable
        requestedMonth={monat}
        records={view.auffaelligkeitRecords ?? []}
        lastCompleteDayKey={view.lastCompleteDayKey}
      />
    );
  }

  const view = await loadGermanyView(new Date(), "/monat", {});
  const records = view.auffaelligkeitRecords ?? [];

  if (!monthHasAnyRecord(monat, records)) {
    return (
      <MonatUnavailable
        requestedMonth={monat}
        records={records}
        lastCompleteDayKey={view.lastCompleteDayKey}
      />
    );
  }

  const fleetFactor = parseFleetFactor(query.faktor);
  const fleetStrategy = parseFleetStrategy(query.fahrweise);
  const grid = buildMonatGrid({
    monthKey: monat,
    records,
    todayKey: view.todayKey,
    lastCompleteDayKey: view.lastCompleteDayKey,
  });
  const bars = barsFromMonatGrid(grid);

  const fleetSlot = nationalFleetMonthAvailable(monat) ? (
    <NationalFleetMonatSlot monthKey={monat} factor={fleetFactor} strategy={fleetStrategy} bars={bars} />
  ) : (
    <NationalFleetMonthUnavailable monthKey={monat} />
  );

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[720px] max-w-[1200px]" />}>
      <MonatPageV4
        monthKey={monat}
        todayKey={view.todayKey}
        lastCompleteDayKey={view.lastCompleteDayKey}
        records={records}
        dataStand={view.stand}
        fleetFactor={fleetFactor}
        fleetStrategy={fleetStrategy}
      >
        {fleetSlot}
      </MonatPageV4>
    </Suspense>
  );
}
