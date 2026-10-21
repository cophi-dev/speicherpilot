import { Suspense } from "react";

import { LiveView } from "@/components/live/LiveView";
import { Skeleton } from "@/components/ui/skeleton";
import { loadHomeBriefingInitialData } from "@/lib/homeBriefingData";
import { loadLiveBoard } from "@/lib/loadLiveBoard";

export const metadata = {
  title: "Was heute los ist",
  description: "Live wind and solar in the 50Hertz control area, DE-LU day-ahead prices, and the Germany snapshot. Each chart names its geography.",
};

export default async function LivePage() {
  const initial = await loadHomeBriefingInitialData();
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
      <LiveView board={board} />
    </Suspense>
  );
}
