import { Suspense } from "react";

import { ExampleDaysIsland } from "@/components/home/ExampleDaysIsland";
import { MarketingHome } from "@/components/home/MarketingHome";
import NewsPreviewSection from "@/components/NewsPreviewSection";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { chooseStorageDay } from "@/lib/liveFleetDispatch";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { loadWindSolarDays } from "@/lib/loadWindSolarResidual";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export default async function Home() {
  const now = new Date();
  const todayKey = formatBerlinDateKeyFromUtcDate(now);
  const [fleet, days] = await Promise.all([loadLargeBatteryFleet(), loadWindSolarDays(now)]);
  const chosen = chooseStorageDay(days, todayKey);

  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[480px] max-w-[1200px]" />}>
      <MarketingHome
        todayKey={todayKey}
        dispatch={{
          fleet: fleet
            ? {
                powerMw: fleet.powerGw * 1000,
                energyMwh: fleet.energyGwh * 1000,
                powerGw: fleet.powerGw,
                energyGwh: fleet.energyGwh,
                updatedLabel: fleet.updatedLabel,
                source: fleet.source,
                href: fleet.chartUrl,
              }
            : null,
          day: chosen?.day ?? null,
          fallback: Boolean(chosen?.fallback),
        }}
      />
      <ExampleDaysIsland />
      <NewsPreviewSection place="home" />
    </Suspense>
  );
}
