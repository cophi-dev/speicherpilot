import { Suspense } from "react";

import { TagPageV4 } from "@/components/home/AuffaelligkeitKopf";
import { TagUnavailable } from "@/components/home/TagUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { auffaelligkeitForDay } from "@/lib/auffaelligkeit";
import { loadGermanyView } from "@/lib/germanyView";
import { lastSurplusBefore, tagSurplusLine } from "@/lib/kopfTagCopy";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ datum: string }> }) {
  const { datum } = await params;
  return {
    title: `Tag · ${datum}`,
    description: "Ein Tag in Deutschland: Lücke, Residuallast und Kennzahlen mit Rang.",
  };
}

export default async function TagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ datum: string }>;
  searchParams: Promise<{ x?: string | string[] }>;
}) {
  const { datum } = await params;
  const query = await searchParams;
  const view = await loadGermanyView(new Date(), "/tag", { tag: datum, ...query });

  const records = view.auffaelligkeitRecords;
  const record = records?.find((r) => r.dateKey === datum) ?? null;

  if (view.requestedTagStatus === "ausserhalb" || view.requestedTagStatus === "unvollstaendig") {
    return (
      <TagUnavailable
        requested={datum}
        todayKey={view.todayKey}
        status={view.requestedTagStatus === "ausserhalb" ? "ausserhalb" : "unvollstaendig"}
        record={record}
      />
    );
  }

  const dayKey = datum;
  const day = view.dispatch.day;

  if (!records || !day || day.dateBerlin !== datum) {
    return (
      <TagUnavailable requested={datum} todayKey={view.todayKey} status="ausserhalb" record={record} />
    );
  }

  const recordIndex = records.findIndex((r) => r.dateKey === dayKey);
  if (recordIndex >= 0 && recordIndex < 30) {
    return (
      <TagUnavailable requested={datum} todayKey={view.todayKey} status="vorlauf" record={records[recordIndex]} />
    );
  }

  const result = auffaelligkeitForDay(records, dayKey);
  const lastSurplus = lastSurplusBefore(records, dayKey);

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[920px] max-w-[1200px]" />}>
      <TagPageV4
        dayKey={dayKey}
        todayKey={view.todayKey}
        dataStand={view.stand}
        result={result}
        records={records}
        day={day}
        lastSurplusKey={lastSurplus}
      />
    </Suspense>
  );
}
