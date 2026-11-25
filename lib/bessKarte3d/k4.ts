/**
 * K4 (speicherpilot 25.11 14:42): Rang der Speicher-Nettoleistung (MW) je GW installierter Wind- und
 * PV-Leistung gegen EE-Redispatch 2025 ohne Wind Offshore je GW installierter Wind- und PV-Leistung,
 * 14 Länder (Hamburg und Berlin k. A.). Aus ungerundeten Werten rechnen: gerundete Quoten erzeugen
 * Bindungen und kippen r_s auf −0,03.
 *
 * EE-Leistung: BNetzA EE-Statistik Oktober 2026, MaStR-Stand 16.11.2026, Bruttoleistung Solar + Wind an
 * Land (GW), aus speicherpilot karte_3d_v1/daten/ee_bestand_bundeslaender.csv. Nicht eeStockBundeslaender
 * aus bundle.json verwenden (verkürzter Auszug).
 */
import type { BundeslandKarteDatum } from "@/lib/bessKarte3d/types";

/** Wortlaut K4, überall gleich (Kleindruck und /methodik). */
export const K4_SATZ =
  "Rang der Speicher-Nettoleistung (MW) je GW installierter Wind- und PV-Leistung gegen EE-Redispatch 2025 ohne Wind Offshore je GW installierter Wind- und PV-Leistung, 14 Länder (Hamburg und Berlin k.\u00a0A.): Rangkorrelation nach Spearman −0,02.";

export const EE_WIND_PV_GW: Readonly<Record<string, number>> = {
  "Baden-Württemberg": 18.852,
  Bayern: 38.094,
  Berlin: 0.605,
  Brandenburg: 20.044,
  Bremen: 0.413,
  Hamburg: 0.437,
  Hessen: 9.121,
  "Mecklenburg-Vorpommern": 9.954,
  Niedersachsen: 26.454,
  "Nordrhein-Westfalen": 26.288,
  "Rheinland-Pfalz": 11.204,
  Saarland: 1.939,
  Sachsen: 7.554,
  "Sachsen-Anhalt": 12.165,
  "Schleswig-Holstein": 15.717,
  "Thüringen": 5.603,
};

function raenge(werte: readonly number[]): number[] {
  const idx = werte.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(werte.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1]![0] === idx[i]![0]) j += 1;
    const mittel = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) r[idx[k]![1]] = mittel;
    i = j + 1;
  }
  return r;
}

/** Rangkorrelation nach Spearman (Pearson der Ränge, Bindungen gemittelt). */
export function spearman(x: readonly number[], y: readonly number[]): number {
  const rx = raenge(x);
  const ry = raenge(y);
  const n = rx.length;
  const mx = rx.reduce((s, v) => s + v, 0) / n;
  const my = ry.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (rx[i]! - mx) * (ry[i]! - my);
    sxx += (rx[i]! - mx) ** 2;
    syy += (ry[i]! - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

export type K4Punkt = { bundesland: string; mwJeGw: number; gwhJeGw: number };

/** K4-Punkte (nur Länder mit BMWE-Wert), optional mit gerundeten Quoten (für den Gegentest). */
export function k4Punkte(laender: readonly BundeslandKarteDatum[], runden?: number): K4Punkt[] {
  const r = (v: number) => (runden === undefined ? v : Number(v.toFixed(runden)));
  const out: K4Punkt[] = [];
  for (const b of laender) {
    const ges = b.abregelung2025Gwh;
    const ee = EE_WIND_PV_GW[b.bundesland];
    if (ges == null || !ee) continue;
    const ohneOffshore = ges - (b.abregelung2025OffshoreGwh ?? 0);
    out.push({ bundesland: b.bundesland, mwJeGw: r(b.nettoMw / ee), gwhJeGw: r(ohneOffshore / ee) });
  }
  return out;
}

export function k4Rangkorrelation(laender: readonly BundeslandKarteDatum[], runden?: number): number {
  const p = k4Punkte(laender, runden);
  return spearman(
    p.map((x) => x.mwJeGw),
    p.map((x) => x.gwhJeGw),
  );
}
