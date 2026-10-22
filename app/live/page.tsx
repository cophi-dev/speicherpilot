import { Suspense } from "react";

import { LiveView } from "@/components/live/LiveView";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { chooseStorageDay, dayIsUsable } from "@/lib/liveFleetDispatch";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { loadWindSolarDays } from "@/lib/loadWindSolarResidual";

export const metadata = {
  title: "Was wäre, wenn Deutschland mehr Speicher hätte?",
  description:
    "Der Ring zeigt die Residuallast und die Abendspitze, wenn die heutige Großspeicher-Flotte von ×1 bis ×10 wächst. Der Speicher startet leer und lädt nur Überschuss.",
};

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[]; x?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestedTag = Array.isArray(query.tag) ? query.tag[0] : query.tag;
  const now = new Date();
  const berlinTodayKey = formatBerlinDateKeyFromUtcDate(now);
  const [fleet, days] = await Promise.all([loadLargeBatteryFleet(), loadWindSolarDays(now)]);
  const tagged = requestedTag && /^\d{4}-\d{2}-\d{2}$/.test(requestedTag) ? days.find((day) => day.dateBerlin === requestedTag) : null;
  const chosen = tagged && dayIsUsable(tagged)
    ? { day: tagged, fallback: tagged.dateBerlin !== berlinTodayKey }
    : chooseStorageDay(days, berlinTodayKey);
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-[920px] max-w-[1200px]" />}>
      <LiveView
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
    </Suspense>
  );
}
