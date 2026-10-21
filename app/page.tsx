import { Suspense } from "react";

import { MarketingHome } from "@/components/home/MarketingHome";
import { Skeleton } from "@/components/ui/skeleton";
import { loadHomeBriefingInitialData } from "@/lib/homeBriefingData";

export default async function Home() {
  const initial = await loadHomeBriefingInitialData();
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-64 max-w-[1200px]" />}>
      <MarketingHome initial={initial} />
    </Suspense>
  );
}
