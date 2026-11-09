import { Suspense } from "react";
import { permanentRedirect } from "next/navigation";

import { TagPageV4 } from "@/components/home/AuffaelligkeitKopf";
import { TagUnavailable } from "@/components/home/TagUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { auffaelligkeitForDay } from "@/lib/auffaelligkeit";
import { loadGermanyView } from "@/lib/germanyView";
import { lastSurplusBefore } from "@/lib/kopfTagCopy";
import {
  nationalFleetMonthAvailable,
  parseFleetFactor,
  parseFleetStrategy,
  sliceFleetDay,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetRunSeries } from "@/lib/nationalMonthFleetModel.server";
import { NationalFleetTagSlot, fleetDayNoWindSolarSurplus } from "@/components/home/NationalFleetTagSlot";

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
  searchParams: Promise<{ x?: string | string[]; faktor?: string; fahrweise?: string }>;
}) {
  const { datum } = await params;
  const query = await searchParams;
  const view = await loadGermanyView(new Date(), "/tag", { tag: datum, ...query });

  const records = view.auffaelligkeitRecords;
  const record = records?.find((r) => r.dateKey === datum) ?? null;
  const lastComplete = view.lastCompleteDayKey;

  if (datum > view.todayKey) {
    permanentRedirect(`/tag/${lastComplete}`);
  }

  if (view.requestedTagStatus === "unvollstaendig" || datum > lastComplete) {
    permanentRedirect(`/tag/${lastComplete}`);
  }

  if (view.requestedTagStatus === "ausserhalb") {
    return (
      <TagUnavailable
        requested={datum}
        todayKey={view.todayKey}
        status="ausserhalb"
        record={record}
        lastCompleteDayKey={lastComplete}
      />
    );
  }

  const dayKey = datum;
  const day = view.dispatch.day;

  if (!records || !day || day.dateBerlin !== datum) {
    return (
      <TagUnavailable
        requested={datum}
        todayKey={view.todayKey}
        status="ausserhalb"
        record={record}
        lastCompleteDayKey={lastComplete}
      />
    );
  }

  const recordIndex = records.findIndex((r) => r.dateKey === dayKey);
  if (recordIndex >= 0 && recordIndex < 30) {
    return (
      <TagUnavailable
        requested={datum}
        todayKey={view.todayKey}
        status="vorlauf"
        record={records[recordIndex]}
        lastCompleteDayKey={lastComplete}
      />
    );
  }

  const result = auffaelligkeitForDay(records, dayKey);
  const lastSurplus = lastSurplusBefore(records, dayKey);
  const fleet = view.dispatch.fleet;

  if (!fleet) {
    return null;
  }

  const fleetFactor = parseFleetFactor(typeof query.faktor === "string" ? query.faktor : undefined);
  const fleetStrategy = parseFleetStrategy(
    typeof query.fahrweise === "string" ? query.fahrweise : undefined,
  );
  const fleetMonth = nationalFleetMonthAvailable(dayKey.slice(0, 7));
  const fleetRun = fleetMonth ? loadNationalFleetRunSeries(fleetFactor, fleetStrategy) : null;
  const fleetSlice = fleetRun ? sliceFleetDay(fleetRun, dayKey) : null;
  const fleetDayNoWindSolarSurplusFlag = fleetDayNoWindSolarSurplus(fleetSlice);
  const fleetSlot =
    fleetRun && fleetSlice ? (
      <NationalFleetTagSlot
        dayKey={dayKey}
        factor={fleetFactor}
        strategy={fleetStrategy}
        preloadedRun={fleetRun}
      />
    ) : null;

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[920px] max-w-[1200px]" />}>
      <TagPageV4
        dayKey={dayKey}
        todayKey={view.todayKey}
        lastCompleteDayKey={lastComplete}
        dataStand={view.stand}
        result={result}
        records={records}
        day={day}
        lastSurplusKey={lastSurplus}
        dayOverview={view.dayOverview}
        fleetPowerGw={fleet.powerGw}
        fleetEnergyGwh={fleet.energyGwh}
        fleetFactor={fleetFactor}
        fleetStrategy={fleetStrategy}
        fleetDayNoWindSolarSurplus={fleetDayNoWindSolarSurplusFlag}
      >
        {fleetSlot}
      </TagPageV4>
    </Suspense>
  );
}
