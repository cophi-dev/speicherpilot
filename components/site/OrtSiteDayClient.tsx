"use client";

import dynamic from "next/dynamic";

import { OrtPageBody } from "@/components/site/OrtPageBody";
import type { ReferenceParkModelDay } from "@/lib/referenceParkModelDay";
import type { NetzSelection } from "@/lib/netzDemo";
import type { Perspective, ScenarioId } from "@/lib/perspective";

const SiteDay = dynamic(() => import("@/components/site/SiteDay").then((m) => ({ default: m.SiteDay })), {
  ssr: false,
  loading: () => null,
});

function reserveMinHeight(view: Perspective, scenario: ScenarioId): number {
  if (scenario === "grossspeicher") {
    return view === "netz" ? 4200 : 2400;
  }
  if (view === "netz") {
    return 5200;
  }
  return 2200;
}

export function OrtSiteDayClient({
  modelDay,
  netzSelection,
  view,
  scenario,
}: {
  modelDay: ReferenceParkModelDay | null;
  netzSelection: NetzSelection;
  view: Perspective;
  scenario: ScenarioId;
}) {
  return (
    <div className="ort-calc-wrap" style={{ minHeight: reserveMinHeight(view, scenario) }}>
      {scenario === "grossspeicher" ? (
        <SiteDay modelDay={modelDay} netzSelection={netzSelection} shellHidden view={view} scenario={scenario} />
      ) : (
        <OrtPageBody view={view} scenario={scenario} modelDay={modelDay} netzSelection={netzSelection} />
      )}
    </div>
  );
}
