import { Suspense } from "react";

import { LiveView } from "@/components/live/LiveView";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { buildDayClock } from "@/lib/dayClock";
import { loadHomeBriefingInitialData } from "@/lib/homeBriefingData";
import { chooseStorageDay, dayIsUsable } from "@/lib/liveFleetDispatch";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { loadLiveBoard } from "@/lib/loadLiveBoard";
import { loadWindSolarDays } from "@/lib/loadWindSolarResidual";

export const metadata = {
  title: "Was wäre, wenn Deutschland mehr Speicher hätte?",
  description:
    "A model of today’s German residual load with the large-storage fleet scaled from ×1 to ×10. The battery starts empty, charges on surplus, and cuts the evening peak. No euro figures.",
};

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestedTag = Array.isArray(query.tag) ? query.tag[0] : query.tag;
  const now = new Date();
  const berlinTodayKey = formatBerlinDateKeyFromUtcDate(now);
  const initial = await loadHomeBriefingInitialData(now);
  const [board, fleet, days] = await Promise.all([
    loadLiveBoard({
      now,
      germany: initial.market
        ? {
            timestampIso: initial.market.realtimeSystem.timestampIso,
            loadMw: initial.market.realtimeSystem.loadMw,
            generationMw: initial.market.realtimeSystem.domesticGenerationMw,
          }
        : null,
    }),
    loadLargeBatteryFleet(),
    loadWindSolarDays(now),
  ]);
  const today = days.find((day) => day.dateBerlin === berlinTodayKey) ?? null;
  const tagged = requestedTag && /^\d{4}-\d{2}-\d{2}$/.test(requestedTag) ? days.find((day) => day.dateBerlin === requestedTag) : null;
  const chosen = tagged && dayIsUsable(tagged)
    ? { day: tagged, fallback: tagged.dateBerlin !== berlinTodayKey }
    : chooseStorageDay(days, berlinTodayKey);
  const clock = buildDayClock({
    dateBerlin: berlinTodayKey,
    slots: today?.slots ?? [],
    fleet: fleet ? { energyGwh: fleet.energyGwh, updatedLabel: fleet.updatedLabel } : null,
  });
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-64 max-w-[1200px]" />}>
      <LiveView
        board={board}
        clock={clock}
        todayKey={berlinTodayKey}
        dispatch={{
          fleet: fleet
            ? {
                powerMw: fleet.powerGw * 1000,
                energyMwh: fleet.energyGwh * 1000,
                powerGw: fleet.powerGw,
                energyGwh: fleet.energyGwh,
                updatedLabel: fleet.updatedLabel,
                source: fleet.source,
                href: fleet.chartUrl,
              }
            : null,
          day: chosen?.day ?? null,
          fallback: Boolean(chosen?.fallback),
        }}
      />
    </Suspense>
  );
}
