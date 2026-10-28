import { Suspense } from "react";

import { ExampleDaysIsland } from "@/components/home/ExampleDaysIsland";
import { MarketingHome } from "@/components/home/MarketingHome";
import NewsPreviewSection from "@/components/NewsPreviewSection";
import { Skeleton } from "@/components/ui/skeleton";
import { loadGermanyView } from "@/lib/germanyView";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; zeitraum?: string | string[] }>;
}) {
  const query = await searchParams;
  const view = await loadGermanyView(new Date(), "/", query);

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[480px] max-w-[1200px]" />}>
      <MarketingHome
        todayKey={view.todayKey}
        until={view.until}
        dispatch={view.dispatch}
        exampleDispatch={view.exampleDispatch}
        stand={view.stand}
        readings={view.readings}
        board={view.board}
      />
      <ExampleDaysIsland />
      <NewsPreviewSection place="home" />
    </Suspense>
  );
}
