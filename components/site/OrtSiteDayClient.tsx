"use client";

import dynamic from "next/dynamic";

import { OrtPageBody } from "@/components/site/OrtPageBody";
import type { ReferenceParkModelDay } from "@/lib/referenceParkModelDay";
import type { Perspective, ScenarioId } from "@/lib/perspective";

const SiteDay = dynamic(() => import("@/components/site/SiteDay").then((m) => ({ default: m.SiteDay })), {
  ssr: false,
  loading: () => null,
});

function reserveMinHeight(view: Perspective, scenario: ScenarioId): number | undefined {
  if (scenario === "grossspeicher") {
    return view === "netz" ? 4200 : 2400;
  }
  if (view === "netz") {
    return undefined;
  }
  return 2200;
}

export function OrtSiteDayClient({
  modelDay,
  view,
  scenario,
}: {
  modelDay: ReferenceParkModelDay | null;
  view: Perspective;
  scenario: ScenarioId;
}) {
  const minHeight = reserveMinHeight(view, scenario);
  return (
    <div className="ort-calc-wrap" style={minHeight ? { minHeight } : undefined}>
      {scenario === "grossspeicher" ? (
        <SiteDay modelDay={modelDay} shellHidden view={view} scenario={scenario} />
      ) : (
        <OrtPageBody view={view} scenario={scenario} modelDay={modelDay} />
      )}
    </div>
  );
}
