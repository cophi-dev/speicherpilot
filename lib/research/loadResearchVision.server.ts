import "server-only";

import visionRows from "@/data/forschung/vision-oktober-neu.json";
import type { VisionCurvePoint, VisionPageModel, VisionStageId } from "@/lib/research/researchTypes";

const BASE_GW = 4.64409022;

const STAGES: Array<{ id: VisionStageId | "x1"; label: string; powerGw: number; csv: string }> = [
  { id: "x1", label: "×1", powerGw: BASE_GW, csv: "x1" },
  { id: "x2", label: "×2", powerGw: 9.28818044, csv: "x2" },
  { id: "x5", label: "×5", powerGw: 23.2204511, csv: "x5" },
  { id: "nep-a", label: "A", powerGw: 41.1, csv: "NEP A" },
  { id: "x10", label: "×10", powerGw: 46.4409022, csv: "x10" },
  { id: "nep-b", label: "B", powerGw: 67.6, csv: "NEP B" },
  { id: "nep-c", label: "C", powerGw: 94.1, csv: "NEP C" },
];

function rowSenkung(stufe: string, dauer: number): number {
  const typed = visionRows as Array<{ stufe: string; dauer_h: number; senkung_GW: number }>;
  const row = typed.find((r) => r.stufe === stufe && Math.abs(r.dauer_h - dauer) < 0.02);
  return row ? row.senkung_GW : 0;
}

const D176 = 1.7554479809395263;

export function buildResearchVision(): VisionPageModel {
  const curve: VisionCurvePoint[] = STAGES.map((meta) => ({
    id: meta.id,
    label: meta.label,
    powerGw: meta.powerGw,
    senkungGw: {
      "1.76": meta.id === "x1" ? 0 : rowSenkung(meta.csv, D176),
      "2": meta.id === "x1" ? 0 : rowSenkung(meta.csv, 2),
      "4": meta.id === "x1" ? 0 : rowSenkung(meta.csv, 4),
    },
  }));

  return {
    monthLabel: "Oktober 2026",
    peakGw: 64.41,
    commitmentsGw: 78,
    curve,
    defaultDuration: "2",
    defaultStage: "nep-b",
  };
}
