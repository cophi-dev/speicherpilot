import { Suspense } from "react";

import { MarketingHome } from "@/components/home/MarketingHome";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBerlinDateKeyFromUtcDate, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { buildHeuteImNetz } from "@/lib/heuteImNetz";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { loadLiveBoard } from "@/lib/loadLiveBoard";
import { loadWindSolarDays } from "@/lib/loadWindSolarResidual";
import type { LiveBoard } from "@/lib/liveBoard";

function dayAheadNow(board: LiveBoard, nowMs: number): number | null {
  if (board.priceChart.length === 0) return null;
  const past = board.priceChart.filter((point) => point.unixMs <= nowMs);
  return (past.at(-1) ?? board.priceChart[0])?.primary ?? null;
}

export default async function Home() {
  const now = new Date();
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const yesterdayKey = prevBerlinDateKey(todayKey);
  const [board, fleet, days] = await Promise.all([
    loadLiveBoard({ now }),
    loadLargeBatteryFleet(),
    loadWindSolarDays(now),
  ]);
  const heute = buildHeuteImNetz({
    now,
    todayKey,
    today: days.find((day) => day.dateBerlin === todayKey) ?? null,
    yesterday: days.find((day) => day.dateBerlin === yesterdayKey) ?? null,
    fleet,
    hertzSharePct: board.modules.find((item) => item.id === "hertz")?.figure ?? null,
    dayAheadEurPerMwh: dayAheadNow(board, now.getTime()),
  });

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[480px] max-w-[1200px]" />}>
      <MarketingHome heute={heute} />
    </Suspense>
  );
}
