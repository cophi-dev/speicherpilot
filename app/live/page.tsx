import { Suspense } from "react";

import { LiveView } from "@/components/live/LiveView";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { loadHomeBriefingInitialData } from "@/lib/homeBriefingData";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { loadLiveBoard } from "@/lib/loadLiveBoard";
import { loadWindSolarDays } from "@/lib/loadWindSolarResidual";
import { pickSurplusDay } from "@/lib/windSolarResidual";

export const metadata = {
  title: "Was heute los ist",
  description: "Live wind and solar in the 50Hertz control area, DE-LU day-ahead prices, the Germany snapshot, and a model of more large storage. Each chart names its geography.",
};

export default async function LivePage() {
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
  const picked = pickSurplusDay(days, berlinTodayKey);
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-64 max-w-[1200px]" />}>
      <LiveView
        board={board}
        fleet={fleet}
        days={days}
        todayKey={berlinTodayKey}
        initialDate={picked?.day.dateBerlin ?? null}
        initialFallback={picked?.fallback ?? false}
      />
    </Suspense>
  );
}
