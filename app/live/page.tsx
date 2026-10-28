import { Suspense } from "react";

import { LiveView } from "@/components/live/LiveView";
import { Skeleton } from "@/components/ui/skeleton";
import { loadGermanyView } from "@/lib/germanyView";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export const metadata = {
  title: "Was wäre, wenn Deutschland mehr Speicher hätte?",
  description:
    "A model of today’s German residual load with the large-storage fleet scaled from ×1 to ×10. The battery starts empty, charges on surplus, and cuts the evening peak. No euro figures.",
};

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; x?: string | string[]; zeitraum?: string | string[] }>;
}) {
  const query = await searchParams;
  const view = await loadGermanyView(new Date(), "/live", query);
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[920px] max-w-[1200px]" />}>
      <LiveView
        dispatch={view.dispatch}
        until={view.until}
        stand={view.stand}
        readings={view.readings}
        board={view.board}
      />
    </Suspense>
  );
}
