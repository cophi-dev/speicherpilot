import { Suspense } from "react";

import { LiveView } from "@/components/live/LiveView";
import { Skeleton } from "@/components/ui/skeleton";
import { loadGermanyView } from "@/lib/germanyView";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export const metadata = {
  title: "Tag · Was wäre, wenn Deutschland mehr Speicher hätte?",
  description:
    "Ein Tag in Deutschland: Ring, Regler ×1 bis ×10 und Erzeugung und Last — Live-Daten, einfache Sprache.",
};

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; x?: string | string[] }>;
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
        overviews={view.overviews}
        dayOverview={view.dayOverview}
        todayKey={view.todayKey}
        requestedTag={view.requestedTag}
        requestedTagStatus={view.requestedTagStatus}
      />
    </Suspense>
  );
}
