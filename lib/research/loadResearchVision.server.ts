import "server-only";

import datenJahr from "@/data/forschung/daten_jahr_v1.json";
import { formatVisionGwMinus, formatVisionGwOne } from "@/lib/research/visionJahrFormat";
import type { VisionJahrModel, VisionJahrStage, VisionJahrStufeKey } from "@/lib/research/visionJahrTypes";
import type { VisionCurvePoint, VisionStageId } from "@/lib/research/researchTypes";

const DURATION_2H = 2;
const DURATION_4H = 4;
const D176 = 1.7607134310237569;

type JsonStufe = {
  stufe: string;
  P_ges_GW: number;
  dauer_h: number;
  senkung_GW: number;
  spitze_nach_GW: number;
  tage_kappe: number;
};

const STAGE_META: Array<{
  key: VisionJahrStufeKey;
  id: VisionStageId;
  label: string;
}> = [
  { key: "x2", id: "x2", label: "×2" },
  { key: "x5", id: "x5", label: "×5" },
  { key: "NEP A", id: "nep-a", label: "A" },
  { key: "x10", id: "x10", label: "×10" },
  { key: "NEP B", id: "nep-b", label: "B" },
  { key: "NEP C", id: "nep-c", label: "C" },
];

function stufeRow(stufen: JsonStufe[], key: string, dauer: number): JsonStufe | undefined {
  return stufen.find((r) => r.stufe === key && Math.abs(r.dauer_h - dauer) < 0.02);
}

function primaryDauerH(key: VisionJahrStufeKey): number {
  return key.startsWith("NEP") ? DURATION_2H : D176;
}

function buildStages2h(stufen: JsonStufe[]): VisionJahrStage[] {
  return STAGE_META.map((meta) => {
    const rowPrimary = stufeRow(stufen, meta.key, primaryDauerH(meta.key))!;
    const row4 = stufeRow(stufen, meta.key, DURATION_4H)!;
    return {
      key: meta.key,
      id: meta.id,
      label: meta.label,
      powerGw: rowPrimary.P_ges_GW,
      senkung2hGw: rowPrimary.senkung_GW,
      senkung4hGw: row4.senkung_GW,
      spitzeNach2hGw: rowPrimary.spitze_nach_GW,
      tageKappe2h: rowPrimary.tage_kappe,
    };
  });
}

function buildCurve(stages: VisionJahrStage[]): VisionCurvePoint[] {
  const x1: VisionCurvePoint = {
    id: "x1",
    label: "×1",
    powerGw: datenJahr.basis.P0_MW / 1000,
    senkungGw: { "1.76": 0, "2": 0, "4": 0 },
  };
  const rows: VisionCurvePoint[] = stages.map((s) => ({
    id: s.id,
    label: s.label,
    powerGw: s.powerGw,
    senkungGw: {
      "1.76": stufeRow(datenJahr.stufen as JsonStufe[], s.key, D176)?.senkung_GW ?? s.senkung2hGw,
      "2": s.senkung2hGw,
      "4": s.senkung4hGw,
    } satisfies VisionCurvePoint["senkungGw"],
  }));
  return [x1, ...rows];
}

function marktGw<K extends string>(block: Record<K, number>): Record<VisionJahrStufeKey, number> {
  const out = {} as Record<VisionJahrStufeKey, number>;
  for (const meta of STAGE_META) {
    out[meta.key] = block[meta.key as K];
  }
  return out;
}

export function buildResearchVision(): VisionJahrModel {
  const stufen = datenJahr.stufen as JsonStufe[];
  const stages2h = buildStages2h(stufen);
  const nepC = stages2h.find((s) => s.key === "NEP C")!;
  const nepA = stages2h.find((s) => s.key === "NEP A")!;

  const vorjahr2hSenkung: Partial<Record<VisionJahrStufeKey, number>> = {};
  for (const row of datenJahr.gegen.vorjahr.stufen as Array<{ stufe: string; dauer: number; senkung_GW: number }>) {
    if (Math.abs(row.dauer - DURATION_2H) < 0.02 && STAGE_META.some((m) => m.key === row.stufe)) {
      vorjahr2hSenkung[row.stufe as VisionJahrStufeKey] = row.senkung_GW;
    }
  }

  const tageshorizont = (datenJahr.gegen.tageshorizont as Array<{ stufe: string; senkung_GW: number }>).find(
    (r) => r.stufe === "NEP A"
  );

  const ueberschussMaxGwh = {} as Record<VisionJahrStufeKey, number>;
  const ueberschussMarktRueckGwh = {} as Record<VisionJahrStufeKey, number>;
  for (const meta of STAGE_META) {
    const block = datenJahr.ueberschuss[meta.key as keyof typeof datenJahr.ueberschuss];
    ueberschussMaxGwh[meta.key] = block.max_aufnahme;
    ueberschussMarktRueckGwh[meta.key] = block["rueckwirkung_b2.86"];
  }

  return {
    stand: datenJahr.stand,
    zeitraumLabel: "16.11.2025–15.11.2026",
    peakGw: datenJahr.basis.spitze_GW,
    peakTag: datenJahr.basis.spitze_tag,
    peakTime: datenJahr.basis.spitze_uhr,
    ueberschussGWh: datenJahr.basis.ueberschuss_GWh,
    commitmentsGw: 78,
    fleetLabel: "4,70 GW / 8,27 GWh, Stand 16.11. · battery-charts.de",
    stages2h,
    vorjahr2hSenkung,
    tageshorizontNepASenkungGw: tageshorizont?.senkung_GW ?? nepA.senkung2hGw,
    marktStressTestGw: marktGw(datenJahr.markt.price_taker_15min),
    marktRueckwirkungLowGw: marktGw(datenJahr.markt.rueckwirkung["b=5.73"]),
    marktRueckwirkungHighGw: marktGw(datenJahr.markt.rueckwirkung["b=2.86"]),
    ueberschussMaxGwh,
    ueberschussMarktRueckGwh,
    tagesspitzen: datenJahr.tagesspitzen.map((d) => ({ tag: d.tag, spitzeGw: d.spitze_GW })),
    kappeNepAGw: nepA.spitzeNach2hGw,
    kappeNepCGw: nepC.spitzeNach2hGw,
    tageNepCCount: datenJahr.tage["NEP C"].n_tage,
    leerTagNepC: datenJahr.tage["NEP C"].leer[0] ?? "2025-12-05",
    curve: buildCurve(stages2h),
    defaultDuration: "2",
    defaultStage: "nep-c",
    peakGwDisplay: formatVisionGwOne(datenJahr.basis.spitze_GW),
    nepCSenkungDisplay: formatVisionGwOne(nepC.senkung2hGw),
    nepASenkungDisplay: formatVisionGwOne(nepA.senkung2hGw),
  };
}

export type { VisionJahrModel } from "@/lib/research/visionJahrTypes";