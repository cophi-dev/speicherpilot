import { Suspense } from "react";

import { LiveView } from "@/components/live/LiveView";
import { Skeleton } from "@/components/ui/skeleton";
import { loadGermanyView } from "@/lib/germanyView";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ datum: string }> }) {
  const { datum } = await params;
  return {
    title: `Tag · ${datum}`,
    description: "Ein Tag in Deutschland: Ring, Regler ×1 bis ×10, Erzeugung, Last und Kennzahlen mit Rang.",
  };
}

export default async function TagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ datum: string }>;
  searchParams: Promise<{ x?: string | string[] }>;
}) {
  const { datum } = await params;
  const query = await searchParams;
  const view = await loadGermanyView(new Date(), "/tag", { tag: datum, ...query });
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
