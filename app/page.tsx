import { Suspense } from "react";

import { MarketingHome } from "@/components/home/MarketingHome";
import { Skeleton } from "@/components/ui/skeleton";
import { loadGermanyView } from "@/lib/germanyView";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export default async function Home() {
  const view = await loadGermanyView(new Date(), "/", {});

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[480px] max-w-[1200px]" />}>
      <MarketingHome overviews={view.overviews} until={view.until} />
    </Suspense>
  );
}
