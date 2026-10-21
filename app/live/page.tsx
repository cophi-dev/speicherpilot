import { Suspense } from "react";

import { LiveView } from "@/components/live/LiveView";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { buildDayClock } from "@/lib/dayClock";
import { loadHomeBriefingInitialData } from "@/lib/homeBriefingData";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { loadLiveBoard } from "@/lib/loadLiveBoard";
import { loadWindSolarDays } from "@/lib/loadWindSolarResidual";

export const metadata = {
  title: "Was heute los ist",
  description: "Live wind and solar in the 50Hertz control area, DE-LU day-ahead prices, and the Germany snapshot. Each chart names its geography.",
};

export default async function LivePage() {
  const now = new Date();
  const [initial, fleet, days] = await Promise.all([
    loadHomeBriefingInitialData(),
    loadLargeBatteryFleet(),
    loadWindSolarDays(now),
  ]);
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const today = days.find((day) => day.dateBerlin === todayKey) ?? null;
  const clock = buildDayClock({
    dateBerlin: todayKey,
    slots: today?.slots ?? [],
    fleet: fleet ? { energyGwh: fleet.energyGwh, updatedLabel: fleet.updatedLabel } : null,
  });
  const board = await loadLiveBoard({
    germany: initial.market
      ? {
          timestampIso: initial.market.realtimeSystem.timestampIso,
          loadMw: initial.market.realtimeSystem.loadMw,
          generationMw: initial.market.realtimeSystem.domesticGenerationMw,
        }
      : null,
  });
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-64 max-w-[1200px]" />}>
      <LiveView board={board} clock={clock} />
    </Suspense>
  );
}
