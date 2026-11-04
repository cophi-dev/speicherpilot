"use client";

import dynamic from "next/dynamic";

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
    return 8800;
  }
  return 1800;
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
    <div className="v4-subpage ort-v4 v4-content ort-calc-wrap mx-auto max-w-[1240px]" style={{ minHeight: reserveMinHeight(view, scenario) }}>
      <SiteDay modelDay={modelDay} netzSelection={netzSelection} shellHidden />
    </div>
  );
}
