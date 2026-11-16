import datenJahr from "@/data/forschung/daten_jahr_v1.json";
import { formatVisionGwOne } from "@/lib/research/visionJahrFormat";
import type { VisionJahrStufeKey } from "@/lib/research/visionJahrTypes";

type JsonStufe = { stufe: string; dauer_h: number; senkung_GW: number; spitze_nach_GW: number };

const DURATION_2H = 2;

function stufeRow(stufen: JsonStufe[], key: string, dauer: number): JsonStufe | undefined {
  return stufen.find((r) => r.stufe === key && Math.abs(r.dauer_h - dauer) < 0.02);
}

export function visionJahrUeberschussPct(key: VisionJahrStufeKey): number {
  const gwh = datenJahr.ueberschuss[key as keyof typeof datenJahr.ueberschuss].max_aufnahme;
  return (gwh / datenJahr.basis.ueberschuss_GWh) * 100;
}

export function visionJahrCoreDisplayFromJson(): {
  peakGw: string;
  nepASenkung: string;
  nepCSenkung: string;
  nepCSpitzeNach: string;
  tageNepC: number;
} {
  const stufen = datenJahr.stufen as JsonStufe[];
  const nepA = stufeRow(stufen, "NEP A", DURATION_2H)!;
  const nepC = stufeRow(stufen, "NEP C", DURATION_2H)!;
  return {
    peakGw: formatVisionGwOne(datenJahr.basis.spitze_GW),
    nepASenkung: formatVisionGwOne(nepA.senkung_GW),
    nepCSenkung: formatVisionGwOne(nepC.senkung_GW),
    nepCSpitzeNach: formatVisionGwOne(nepC.spitze_nach_GW),
    tageNepC: datenJahr.tage["NEP C"].n_tage,
  };
}

export const VISION_JAHR_RAW = datenJahr;