import { Suspense } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import { datasetJsonLd } from "@/lib/seo/jsonLd";
import { tagDocumentTitle, tagPageDescription } from "@/lib/seo/pageTitles";
import { socialMeta } from "@/lib/siteOg";
import { redirect } from "next/navigation";

import { Tagesvorlage } from "@/components/home/Tagesvorlage";
import { formatBerlinDayLabel } from "@/lib/dayRingStory";
import { TagPageLaufend } from "@/components/home/TagPageLaufend";
import { TagUnavailable } from "@/components/home/TagUnavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { auffaelligkeitForDay } from "@/lib/auffaelligkeit";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { isTagDateInSelectWindow } from "@/lib/germanyViewCachePolicy";
import { loadGermanyViewForTag } from "@/lib/germanyViewTag.server";
import { lastSurplusBefore } from "@/lib/kopfTagCopy";
import { loadLiveTagView } from "@/lib/liveTagView.server";
import { resolveNavShortcuts } from "@/lib/navShortcuts.server";
import {
  nationalFleetMonthAvailable,
  monthStatsForRun,
  parseTagFleetFactor,
  parseFleetStrategy,
  sliceFleetDay,
} from "@/lib/nationalMonthFleetModel";
import {
  NATIONAL_FLEET_DISPLAY_ENERGY_GWH,
  NATIONAL_FLEET_DISPLAY_POWER_GW,
} from "@/lib/nationalFleetDisplay";
import { loadNationalFleetRunSeries, nationalFleetContext, nationalFleetIsolatedDayAvailable } from "@/lib/nationalMonthFleetModel.server";
import { fleetDayNoWindSolarSurplus } from "@/components/home/NationalFleetTagSlot";
import { marktInsightsForLiveTag, marktInsightsForRoute } from "@/lib/marktInsightsPage.server";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ datum: string }> }) {
  const { datum } = await params;
  const todayKey = formatBerlinDateKeyFromUtcDate(new Date());
  const isToday = datum === todayKey;
  const description = tagPageDescription(datum, isToday);
  const title = tagDocumentTitle(datum, isToday);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/tag/${datum}` },
    ...(isToday ? { robots: { index: false, follow: true } } : {}),
    ...socialMeta({ title, description, url: `/tag/${datum}` }),
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
  const now = new Date();
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const { lastCompleteDayKey: navLastComplete } = await resolveNavShortcuts();

  if (datum === todayKey) {
    const live = await loadLiveTagView(datum, now);
    if (live) {
      const liveMarktInsights = await marktInsightsForLiveTag(live);
      const liveDataset = datasetJsonLd({
        path: `/tag/${datum}`,
        name: tagDocumentTitle(datum, true),
        description: tagPageDescription(datum, true),
        temporalCoverage: datum,
      });
      return (
        <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[920px] max-w-[1200px]" />}>
          <JsonLd data={{ "@context": "https://schema.org", ...liveDataset }} />
          <TagPageLaufend view={live} marktInsights={liveMarktInsights} />
        </Suspense>
      );
    }
    redirect(`/tag/${navLastComplete}`);
  }

  const view = await loadGermanyViewForTag(datum);

  const records = view.auffaelligkeitRecords;
  const record = records?.find((r) => r.dateKey === datum) ?? null;
  const lastComplete = view.lastCompleteDayKey;

  if (datum > view.todayKey) {
    redirect(`/tag/${lastComplete}`);
  }

  if (datum > lastComplete) {
    redirect(`/tag/${lastComplete}`);
  }

  const inWindow = isTagDateInSelectWindow(datum, view.todayKey);

  if (view.requestedTagStatus === "unvollstaendig") {
    if (inWindow) {
      redirect(`/tag/${lastComplete}`);
    }
    return (
      <TagUnavailable
        requested={datum}
        todayKey={view.todayKey}
        status="unvollstaendig"
        record={record}
        lastCompleteDayKey={lastComplete}
      />
    );
  }

  if (view.requestedTagStatus === "ausserhalb") {
    if (inWindow) {
      redirect(`/tag/${lastComplete}`);
    }
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
    if (inWindow) {
      redirect(`/tag/${lastComplete}`);
    }
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

  const fleetFactor = parseTagFleetFactor(typeof query.faktor === "string" ? query.faktor : undefined);
  const fleetStrategy = parseFleetStrategy(typeof query.fahrweise === "string" ? query.fahrweise : undefined);
  const fleetMonthKey = dayKey.slice(0, 7);
  const fleetMonth = nationalFleetMonthAvailable(fleetMonthKey);
  const fleetRun = fleetMonth
    ? loadNationalFleetRunSeries(fleetFactor, fleetStrategy, { monthKey: fleetMonthKey, dayKey })
    : null;
  const fleetSlice = fleetRun ? sliceFleetDay(fleetRun, dayKey) : null;
  const fleetDayNoWindSolarSurplusFlag = fleetDayNoWindSolarSurplus(fleetSlice);
  const fleetSoGerechnet =
    fleetRun && fleetSlice
      ? {
          dayKey,
          factor: fleetFactor,
          strategy: fleetStrategy,
          run: fleetRun,
          slice: fleetSlice,
          monthStats: monthStatsForRun(
            nationalFleetContext(fleetFactor, fleetStrategy, { monthKey: fleetMonthKey, dayKey }),
            fleetFactor,
            fleetStrategy,
            fleetRun,
          ),
          showPeakWithoutSurplus:
            fleetSlice.positiveSurplusQuarterHours === 0 && fleetSlice.chargeMwh > 1,
          isolatedDayHorizon: nationalFleetIsolatedDayAvailable(fleetMonthKey, dayKey),
        }
      : null;
  const marktInsights = marktInsightsForRoute({
    route: "tag",
    records,
    fleetPowerGw: fleetMonth ? NATIONAL_FLEET_DISPLAY_POWER_GW : fleet.powerGw,
    fleetEnergyGwh: fleetMonth ? NATIONAL_FLEET_DISPLAY_ENERGY_GWH : fleet.energyGwh,
    focusDayKey: dayKey,
    overview30: view.dayOverview,
    monthKey: fleetMonthKey,
  });

  const tagDataset = datasetJsonLd({
    path: `/tag/${dayKey}`,
    name: tagDocumentTitle(dayKey, dayKey === todayKey),
    description: tagPageDescription(dayKey, dayKey === todayKey),
    temporalCoverage: dayKey,
  });

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[920px] max-w-[1200px]" />}>
      <JsonLd data={{ "@context": "https://schema.org", ...tagDataset }} />
      <Tagesvorlage
        model={{
          dayKey,
          todayKey: view.todayKey,
          lastCompleteDayKey: lastComplete,
          dataStand: view.stand,
          result,
          records,
          day,
          lastSurplusKey: lastSurplus,
          dayOverview: view.dayOverview,
          fleetPowerGw: fleetMonth ? NATIONAL_FLEET_DISPLAY_POWER_GW : fleet.powerGw,
          fleetEnergyGwh: fleetMonth ? NATIONAL_FLEET_DISPLAY_ENERGY_GWH : fleet.energyGwh,
          fleetFactor,
          fleetStrategy,
          fleetDayNoWindSolarSurplus: fleetDayNoWindSolarSurplusFlag,
          preisTag: view.preisTag,
          marktInsights,
          fleetSoGerechnet,
          fleetRun,
          fleetSlice,
          leitfrage: `Was hätte mehr Speicher am ${formatBerlinDayLabel(dayKey)} geändert?`,
          isStartSurface: false,
        }}
      />
    </Suspense>
  );
}