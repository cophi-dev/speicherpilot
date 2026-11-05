import { Suspense } from "react";

import { MonatPageV4 } from "@/components/home/MonatPageV4";
import { MonatUnavailable } from "@/components/home/MonatUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { isBerlinMonthKey, monthHasAnyRecord } from "@/lib/monatCalendar";
import { loadGermanyView } from "@/lib/germanyView";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ monat: string }> }) {
  const { monat } = await params;
  return {
    title: `Monat · ${monat}`,
    description: "Ein Kalendermonat in der geladenen Tagesreihe: Überschuss und Tage mit Kennzahlen.",
  };
}

export default async function MonatDetailPage({ params }: { params: Promise<{ monat: string }> }) {
  const { monat } = await params;
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

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[720px] max-w-[1200px]" />}>
      <MonatPageV4
        monthKey={monat}
        todayKey={view.todayKey}
        lastCompleteDayKey={view.lastCompleteDayKey}
        records={records}
        dataStand={view.stand}
      />
    </Suspense>
  );
}
