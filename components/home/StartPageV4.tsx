"use client";

import { StartGesternTeaser } from "@/components/home/StartGesternTeaser";
import { StartKopf } from "@/components/home/StartKopf";
import { StartOrtTeaser } from "@/components/home/OrtTeasers";
import { SystemChapter } from "@/components/home/SystemChapter";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import type { OverviewsBundle } from "@/lib/germanyView";
import type { HomeDayPanelData } from "@/lib/homeDayPanel";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";
import type { PreisTick } from "@/lib/preisFenster";
import type { ResidualDay } from "@/lib/windSolarResidual";

export function StartPageV4({
  overviews,
  dispatch,
  todayKey,
  kopfDayKey,
  auffaelligkeitRecords,
  dataStand,
  homeDayPanel,
  kopfDay,
  preisTag,
}: {
  overviews: OverviewsBundle | null;
  dispatch: LiveDispatchInput;
  todayKey: string;
  kopfDayKey: string;
  auffaelligkeitRecords: TagesKennzahlRecord[];
  dataStand: string;
  homeDayPanel: HomeDayPanelData | null;
  kopfDay: ResidualDay | null;
  preisTag: PreisTick[];
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

      <StartGesternTeaser
        kopfDayKey={kopfDayKey}
        record={tagRecord}
        day={kopfDay}
        panel={homeDayPanel}
        records={auffaelligkeitRecords}
        prices={preisTag}
        powerGw={fleet.powerGw}
        energyGwh={fleet.energyGwh}
      />

      {systemModel ? (
        <SystemChapter model={systemModel} fleetPowerGw={fleet.powerGw} fleetEnergyGwh={fleet.energyGwh} />
      ) : null}

      <StartOrtTeaser />
    </div>
  );
}
