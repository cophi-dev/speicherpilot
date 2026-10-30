"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { LiveRing } from "@/components/live/LiveRing";
import { SurplusDaySimulation } from "@/components/live/SurplusDaySimulation";
import { LiveStrip } from "@/components/mix/LiveStrip";
import { PowerBoard } from "@/components/mix/PowerBoard";
import { useLanguage } from "@/components/language-context";
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
  overviewLink,
}: {
  dispatch: LiveDispatchInput;
  until: string | null;
  stand: string;
  readings: StripReading[];
  board: PowerBoardModel;
  surplusDay: SurplusDayReport | null;
  overviewLink: string;
}) {
  const { language } = useLanguage();
  const tx = (de: string, en: string) => (language === "de" ? de : en);
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
      <p className="live-overview-link mx-auto max-w-[1200px] px-4 pt-4">
        <Link href={overviewLink}>{tx("Zur Zeitraum-Übersicht auf der Startseite", "To the period overview on the homepage")}</Link>
      </p>
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
