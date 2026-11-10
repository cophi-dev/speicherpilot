import "server-only";

import visionRows from "@/data/forschung/vision-oktober-neu.json";
import type { VisionPageModel, VisionStageId, VisionStagePoint } from "@/lib/research/researchTypes";

const STAGE_ORDER: Array<{ id: VisionStageId; label: string; powerGw: number }> = [
  { id: "x2", label: "×2", powerGw: 9.28818044 },
  { id: "x5", label: "×5", powerGw: 23.2204511 },
  { id: "x10", label: "×10", powerGw: 46.4409022 },
  { id: "nep-a", label: "A", powerGw: 41.1 },
  { id: "nep-b", label: "B", powerGw: 67.6 },
  { id: "nep-c", label: "C", powerGw: 94.1 },
];

function rowSenkung(stufe: string, dauer: number): number | null {
  const typed = visionRows as Array<{ stufe: string; dauer_h: number; senkung_GW: number }>;
  const row = typed.find((r) => r.stufe === stufe && Math.abs(r.dauer_h - dauer) < 0.02);
  return row ? row.senkung_GW : null;
}

const STUFE_MAP: Record<VisionStageId, string> = {
  x2: "x2",
  x5: "x5",
  x10: "x10",
  "nep-a": "NEP A",
  "nep-b": "NEP B",
  "nep-c": "NEP C",
};

export function buildResearchVision(): VisionPageModel {
  const stages: VisionStagePoint[] = STAGE_ORDER.map((meta) => {
    const stufe = STUFE_MAP[meta.id];
    const d176 = rowSenkung(stufe, 1.7554479809395263) ?? 0;
    const d2 = rowSenkung(stufe, 2) ?? 0;
    const d4 = rowSenkung(stufe, 4) ?? 0;
    return {
      id: meta.id,
      label: meta.label,
      powerGw: meta.powerGw,
      durations: { "1.76": d176, "2": d2, "4": d4 },
    };
  });

  return {
    monthLabel: "Oktober 2026",
    peakGw: 64.41,
    stages,
    defaultDuration: "2",
    defaultStage: "nep-b",
  };
}
