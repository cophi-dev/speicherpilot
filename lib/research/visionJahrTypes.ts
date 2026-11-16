import type { VisionCurvePoint, VisionStageId } from "@/lib/research/researchTypes";

export type VisionJahrStufeKey = "x2" | "x5" | "x10" | "NEP A" | "NEP B" | "NEP C";

export type VisionJahrStage = {
  key: VisionJahrStufeKey;
  id: VisionStageId;
  label: string;
  powerGw: number;
  senkung2hGw: number;
  senkung4hGw: number;
  spitzeNach2hGw: number;
  tageKappe2h: number;
};

export type VisionJahrModel = {
  stand: string;
  zeitraumLabel: string;
  peakGw: number;
  peakTag: string;
  peakTime: string;
  ueberschussGWh: number;
  commitmentsGw: number;
  fleetLabel: string;
  stages2h: VisionJahrStage[];
  vorjahr2hSenkung: Partial<Record<VisionJahrStufeKey, number>>;
  tageshorizontNepASenkungGw: number;
  marktStressTestGw: Record<VisionJahrStufeKey, number>;
  marktRueckwirkungLowGw: Record<VisionJahrStufeKey, number>;
  marktRueckwirkungHighGw: Record<VisionJahrStufeKey, number>;
  ueberschussMaxGwh: Record<VisionJahrStufeKey, number>;
  ueberschussMarktRueckGwh: Record<VisionJahrStufeKey, number>;
  tagesspitzen: Array<{ tag: string; spitzeGw: number }>;
  kappeNepAGw: number;
  kappeNepCGw: number;
  tageNepCCount: number;
  leerTagNepC: string;
  /** Für Schätzmodus und Graph 1 (kompatibel mit VisionPlot). */
  curve: VisionCurvePoint[];
  defaultDuration: "2";
  defaultStage: VisionStageId;
  peakGwDisplay: string;
  nepCSenkungDisplay: string;
  nepASenkungDisplay: string;
};