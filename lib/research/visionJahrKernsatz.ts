import datenJahr from "@/data/forschung/daten_jahr_v1.json";
import { formatVisionGwOne } from "@/lib/research/visionJahrFormat";
import type { VisionJahrStufeKey } from "@/lib/research/visionJahrTypes";

const SERIES_KEYS: VisionJahrStufeKey[] = ["x2", "x5", "NEP A", "x10", "NEP B", "NEP C"];
const DURATION_2H = 2;

/** Abschnitt „Übersicht“ (details); der Absatz #vision-jahr liegt lazy darin und ist vor dem Aufklappen nicht im DOM. */
export const VISION_METHODIK_ANCHOR = "uebersicht";

export type VisionJahrKernsatz = {
  /** Fließtext für Seite und Tests */
  paragraph: string;
  /** Kurz für Meta-Description */
  descriptionShort: string;
  useEinFuenftel: boolean;
  preisSpitzenRatio: number;
};

function stufe2h(stufe: string) {
  return (datenJahr.stufen as Array<{ stufe: string; dauer_h: number; senkung_GW: number; P_ges_GW: number }>).find(
    (r) => r.stufe === stufe && Math.abs(r.dauer_h - DURATION_2H) < 0.02
  )!;
}

/** 2025-12-03 → 3.12.2025 (ohne führende Null, wie im Owner-Wortlaut). */
function formatPeakDay(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${Number(day)}.${Number(month)}.${year}`;
}

/** 17:00 → 17 Uhr */
function formatPeakHour(hhmm: string): string {
  const [hour, minute] = hhmm.split(":");
  if (!hour) return hhmm;
  if (!minute || minute === "00") return `${Number(hour)} Uhr`;
  return `${Number(hour)}:${minute} Uhr`;
}

/** Kernsatz aus data/forschung/daten_jahr_v1.json (keine Hardcodierung der Zahlen). */
export function buildVisionJahrKernsatz(): VisionJahrKernsatz {
  const peak = datenJahr.basis.spitze_GW;
  const nepA = stufe2h("NEP A");
  const nepC = stufe2h("NEP C");
  const rtePct = Math.round(datenJahr.annahmen.rte * 100);
  const low = datenJahr.markt.rueckwirkung["b=5.73"] as Record<VisionJahrStufeKey, number>;
  const maxPreisSenkung = Math.max(...SERIES_KEYS.map((k) => Math.max(0, peak - low[k])));
  const spitzenSenkungRef = nepC.senkung_GW;
  const ratio = maxPreisSenkung / spitzenSenkungRef;
  const useEinFuenftel = ratio <= 0.2;
  if (!useEinFuenftel) {
    throw new Error(
      `Kernsatz: Preis-/Spitzen-Verhältnis ${ratio.toFixed(3)} > 0,2 — „Ein Fünftel“ nicht aus JSON ableitbar.`
    );
  }

  const stand = datenJahr.stand;
  const peakDisp = formatVisionGwOne(peak);
  const nepAGw = formatVisionGwOne(nepA.P_ges_GW);
  const nepCGw = formatVisionGwOne(nepC.P_ges_GW);
  const senkADisp = formatVisionGwOne(nepA.senkung_GW);
  const senkCDisp = formatVisionGwOne(nepC.senkung_GW);
  const peakDay = formatPeakDay(datenJahr.basis.spitze_tag);
  const peakHour = formatPeakHour(datenJahr.basis.spitze_uhr);

  const paragraph =
    `Kernaussage (Stand ${stand}): Von 16.11.2025 bis 15.11.2026 lag die höchste Restlast in Deutschland bei ${peakDisp}\u00a0GW (${peakDay}, ${peakHour}). ` +
    `Eine Batteriespeicher-Flotte in Größe von NEP-Szenario A (${nepAGw}\u00a0GW, 2\u00a0h) hätte diese Spitze um ${senkADisp}\u00a0GW gesenkt, ` +
    `Szenario C (${nepCGw}\u00a0GW, 2\u00a0h) um ${senkCDisp}\u00a0GW. ` +
    `Das gilt nur, wenn die Speicher gegen die Spitze fahren, und ist eine Obergrenze. ` +
    `Nach Day-Ahead-Preis gefahren erreicht dieselbe Flotte selbst im günstigen Fall mit grob modellierter Preisrückwirkung höchstens ein Fünftel davon; ` +
    `ohne Rückwirkung kann Laden als neue Last die Spitze anheben. ` +
    `Modellrechnung, national, ohne Netzengpässe und (n\u22121), volle Voraussicht, Wirkungsgrad ${rtePct}\u00a0%. ` +
    `Daten: Energy-Charts, SMARD, battery-charts.`;

  const descriptionShort =
    `NEP-Speicher 2 h senken die Restlastspitze von ${peakDisp} GW um ${senkADisp} bis ${senkCDisp} GW, nach Preis höchstens ein Fünftel davon. Jahresrechnung, Stand 11/2026.`;

  return {
    paragraph,
    descriptionShort,
    useEinFuenftel,
    preisSpitzenRatio: ratio,
  };
}
