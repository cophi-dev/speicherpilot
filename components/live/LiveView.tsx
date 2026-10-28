"use client";

import { LiveRing } from "@/components/live/LiveRing";
import { LiveStrip } from "@/components/mix/LiveStrip";
import { PowerBoard } from "@/components/mix/PowerBoard";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";
import type { StripReading } from "@/lib/liveStrip";
import type { PowerBoardModel } from "@/lib/powerBoard";

export function LiveView({
  dispatch,
  until,
  stand,
  readings,
  board,
}: {
  dispatch: LiveDispatchInput;
  until: string | null;
  stand: string;
  readings: StripReading[];
  board: PowerBoardModel;
}) {
  return (
    <>
      <LiveRing dispatch={dispatch} until={until} leading={<LiveStrip stand={stand} readings={readings} />} />
      <PowerBoard model={board} missingFactor={5} />
    </>
  );
}
