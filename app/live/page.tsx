import { Suspense } from "react";

import { HomeBriefingClient } from "@/components/home/HomeBriefingClient";
import { Skeleton } from "@/components/ui/skeleton";
import { loadHomeBriefingInitialData } from "@/lib/homeBriefingData";

export const metadata = {
  title: "Live",
  description: "Germany generation, load, and storage fleet from Energy-Charts.",
};

export default async function LivePage() {
  const initial = await loadHomeBriefingInitialData();
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-64 max-w-[1200px]" />}>
      <HomeBriefingClient initial={initial} rehoused />
    </Suspense>
  );
}
