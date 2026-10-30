"use client";

import { ConnectionStory } from "@/components/home/ConnectionStory";
import { HomeRing } from "@/components/home/HomeRing";
import { LiveStrip } from "@/components/mix/LiveStrip";
import { PowerBoard } from "@/components/mix/PowerBoard";
import { Uebersicht } from "@/components/uebersicht/Uebersicht";
import type { OverviewUiModel } from "@/lib/germanyView";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";
import type { StripReading } from "@/lib/liveStrip";
import type { PowerBoardModel } from "@/lib/powerBoard";

export function MarketingHome({
  dispatch,
  exampleDispatch,
  todayKey,
  until,
  stand,
  readings,
  board,
  overview,
}: {
  dispatch: LiveDispatchInput;
  exampleDispatch: LiveDispatchInput;
  todayKey: string;
  until: string | null;
  stand: string;
  readings: StripReading[];
  board: PowerBoardModel;
  overview: OverviewUiModel | null;
}) {
  return (
    <div>
      {overview ? <Uebersicht model={overview} until={until} /> : null}
      <HomeRing
        dispatch={dispatch}
        exampleDispatch={exampleDispatch}
        todayKey={todayKey}
        until={until}
        leading={<LiveStrip stand={stand} readings={readings} />}
      />
      <PowerBoard model={board} missingFactor={1} hideSocLine />
      <ConnectionStory />
    </div>
  );
}
