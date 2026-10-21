import { Suspense } from "react";

import { MarketingHome } from "@/components/home/MarketingHome";
import { Skeleton } from "@/components/ui/skeleton";
import { loadHomeBriefingInitialData } from "@/lib/homeBriefingData";
import { loadLiveBoard } from "@/lib/loadLiveBoard";

export default async function Home() {
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
      <MarketingHome board={board} />
    </Suspense>
  );
}
