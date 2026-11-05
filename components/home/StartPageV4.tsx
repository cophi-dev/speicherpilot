"use client";

import { StartGesternTeaser } from "@/components/home/StartGesternTeaser";
import { StartKopf } from "@/components/home/StartKopf";
import { StartOrtTeaser } from "@/components/home/OrtTeasers";
import { SystemChapter } from "@/components/home/SystemChapter";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import type { OverviewsBundle } from "@/lib/germanyView";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";

export function StartPageV4({
  overviews,
  dispatch,
  todayKey,
  kopfDayKey,
  auffaelligkeitRecords,
  dataStand,
}: {
  overviews: OverviewsBundle | null;
  dispatch: LiveDispatchInput;
  todayKey: string;
  kopfDayKey: string;
  auffaelligkeitRecords: TagesKennzahlRecord[];
  dataStand: string;
}) {
  const tagRecord = auffaelligkeitRecords.find((r) => r.dateKey === kopfDayKey);
  const systemModel = overviews?.byBlick["30tage"];
  const fleet = dispatch.fleet;

  if (!overviews || !fleet) {
    return null;
  }

  return (
    <div className="v4-start start-page">
      <StartKopf
        kopfDayKey={kopfDayKey}
        todayKey={todayKey}
        dataStand={dataStand}
        records={auffaelligkeitRecords}
      />

      <StartGesternTeaser kopfDayKey={kopfDayKey} record={tagRecord} />

      {systemModel ? (
        <SystemChapter model={systemModel} fleetPowerGw={fleet.powerGw} fleetEnergyGwh={fleet.energyGwh} />
      ) : null}

      <StartOrtTeaser />
    </div>
  );
}
