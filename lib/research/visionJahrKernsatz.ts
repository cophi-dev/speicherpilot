import datenJahr from "@/data/forschung/daten_jahr_v1.json";
import { formatVisionGwOne } from "@/lib/research/visionJahrFormat";
import type { VisionJahrStufeKey } from "@/lib/research/visionJahrTypes";

const SERIES_KEYS: VisionJahrStufeKey[] = ["x2", "x5", "NEP A", "x10", "NEP B", "NEP C"];
const DURATION_2H = 2;

export const VISION_METHODIK_ANCHOR = "vision-jahr";

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

  const zeitraum = "16.11.2025–15.11.2026";
  const peakDisp = formatVisionGwOne(peak);
  const nepAGw = String(Math.round(nepA.P_ges_GW));
  const nepCGw = String(Math.round(nepC.P_ges_GW));
  const senkADisp = formatVisionGwOne(nepA.senkung_GW);
  const senkCDisp = formatVisionGwOne(nepC.senkung_GW);

  const paragraph =
    `Im Jahr ${zeitraum} lag die höchste Restlast in Deutschland bei ${peakDisp}\u00a0GW. ` +
    `Batteriespeicher im Umfang von NEP-Szenario A (${nepAGw}\u00a0GW, 2\u00a0h) hätten sie um ${senkADisp}\u00a0GW gesenkt, ` +
    `NEP C (${nepCGw}\u00a0GW) um ${senkCDisp}\u00a0GW – wenn sie gegen die Spitze fahren. ` +
    `Nach Day-Ahead-Preis gefahren erreicht dieselbe Flotte höchstens ein Fünftel davon. ` +
    `Modell: national, ohne Netzengpass und (n\u22121), Vollvoraussicht, Wirkungsgrad ${rtePct}\u00a0%.`;

  const descriptionShort =
    `Jahresrechnung ${zeitraum}: Restlast-Spitze ${peakDisp}\u00a0GW, NEP C senkt bis ${senkCDisp}\u00a0GW spitzenorientiert; ` +
    `Day-Ahead höchstens ein Fünftel — national, Vollvoraussicht, Modell SpeicherPilot.`;

  return {
    paragraph,
    descriptionShort,
    useEinFuenftel,
    preisSpitzenRatio: ratio,
  };
}