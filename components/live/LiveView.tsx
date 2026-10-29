"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { LiveRing } from "@/components/live/LiveRing";
import { SurplusDaySimulation } from "@/components/live/SurplusDaySimulation";
import { LiveStrip } from "@/components/mix/LiveStrip";
import { PowerBoard } from "@/components/mix/PowerBoard";
import type { LiveDispatchInput } from "@/lib/liveFleetDispatch";
import { LIVE_DISPATCH_FACTORS, parseLiveFactor, type LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import type { StripReading } from "@/lib/liveStrip";
import type { PowerBoardModel } from "@/lib/powerBoard";
import { surplusSaturationFactor, type SurplusDayReport } from "@/lib/surplusDaySimulation";

export function LiveView({
  dispatch,
  until,
  stand,
  readings,
  board,
  surplusDay,
}: {
  dispatch: LiveDispatchInput;
  until: string | null;
  stand: string;
  readings: StripReading[];
  board: PowerBoardModel;
  surplusDay: SurplusDayReport | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const factor = parseLiveFactor(searchParams.get("x"));

  const saturationIndex = useMemo(() => {
    if (!surplusDay) {
      return null;
    }
    const saturated = surplusSaturationFactor(surplusDay);
    return saturated ? LIVE_DISPATCH_FACTORS.indexOf(saturated) : null;
  }, [surplusDay]);

  function onFactor(next: LiveDispatchFactor) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("x", String(next));
    const query = params.toString();
    router.replace(query ? `/live?${query}` : "/live", { scroll: false });
  }

  return (
    <>
      <LiveRing dispatch={dispatch} until={until} leading={<LiveStrip stand={stand} readings={readings} />} />
      <SurplusDaySimulation
        report={surplusDay}
        factor={factor}
        onFactor={onFactor}
        saturationIndex={saturationIndex}
      />
      <PowerBoard model={board} missingFactor={5} hideSocLine />
    </>
  );
}
