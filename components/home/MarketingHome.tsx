"use client";

import { ConnectionStory } from "@/components/home/ConnectionStory";
import { HomeRing } from "@/components/home/HomeRing";
import { LiveStrip } from "@/components/mix/LiveStrip";
import { PowerBoard } from "@/components/mix/PowerBoard";
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
}: {
  dispatch: LiveDispatchInput;
  exampleDispatch: LiveDispatchInput;
  todayKey: string;
  until: string | null;
  stand: string;
  readings: StripReading[];
  board: PowerBoardModel;
}) {
  return (
    <div>
      <HomeRing
        dispatch={dispatch}
        exampleDispatch={exampleDispatch}
        todayKey={todayKey}
        until={until}
        leading={<LiveStrip stand={stand} readings={readings} />}
      />
      <PowerBoard model={board} missingFactor={1} />
      <ConnectionStory />
    </div>
  );
}
