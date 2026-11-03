"use client";

import { useMemo } from "react";

import { AuffaelligkeitKopf } from "@/components/home/AuffaelligkeitKopf";
import { OrtChapter } from "@/components/home/OrtChapter";
import { SystemChapter } from "@/components/home/SystemChapter";
import { TagChapter } from "@/components/home/TagChapter";
import { tagSurplusLine, lastSurplusBefore } from "@/lib/kopfTagCopy";
import { auffaelligkeitForDay } from "@/lib/auffaelligkeit";
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
  const auff = useMemo(
    () => auffaelligkeitForDay(auffaelligkeitRecords, kopfDayKey),
    [auffaelligkeitRecords, kopfDayKey]
  );

  const tagRecord = auffaelligkeitRecords.find((r) => r.dateKey === kopfDayKey);
  const systemModel = overviews?.byBlick["30tage"];
  const fleet = dispatch.fleet;
  const tagDay = dispatch.day;

  if (!overviews || !fleet || !tagDay) {
    return null;
  }

  const lastSurplus = lastSurplusBefore(auffaelligkeitRecords, kopfDayKey);

  return (
    <div className="v4-start start-page">
      <AuffaelligkeitKopf
        dayKey={kopfDayKey}
        todayKey={todayKey}
        dataStand={dataStand}
        result={auff}
        records={auffaelligkeitRecords}
      />

      <TagChapter
        day={tagDay}
        lastSurplusKey={lastSurplus}
        surplusLine={tagSurplusLine(tagRecord?.surplusGwh ?? 0)}
        peakGw={tagRecord?.eveningPeakGw ?? null}
        peakAt={tagRecord?.eveningPeakAt ?? null}
      />

      {systemModel ? (
        <SystemChapter model={systemModel} fleetPowerGw={fleet.powerGw} fleetEnergyGwh={fleet.energyGwh} />
      ) : null}

      <OrtChapter />
    </div>
  );
}
