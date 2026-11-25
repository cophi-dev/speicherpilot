import type { KarteEinheit } from "@/lib/bessKarte3d/types";

/** Kennzahlen für die Kernerkenntnisse unter der Hero-Karte (/netzbetreiber), aus allen Einheiten (MaStR). */
export type KarteKernzahlen = {
  nettoMw: number;
  lokationen: number;
  /** Größte Lokationen (Netto-MW je Lokation), die zusammen den Konzentrationsanteil tragen. */
  topLokationen: number;
  topNettoMw: number;
  topAnteilPct: number;
  /** Kleinste Lokation innerhalb der Top-Gruppe (MW netto). */
  topMinMw: number;
  zubauJahre: { jahr: number; nettoMw: number }[];
  zubauAnteilPct: number;
};

/**
 * @param topN Anzahl der größten Lokationen (Vorgabe speicherpilot 13:34: 55).
 * @param zubauAb Erstes Inbetriebnahmejahr des „jungen“ Bestands (2025).
 */
export function computeKarteKernzahlen(
  einheiten: readonly Pick<KarteEinheit, "lok" | "nettoMw" | "ibn">[],
  topN = 55,
  zubauAb = 2025,
): KarteKernzahlen {
  const jeLok = new Map<string, number>();
  const jeJahr = new Map<number, number>();
  let nettoMw = 0;
  for (const e of einheiten) {
    nettoMw += e.nettoMw;
    jeLok.set(e.lok, (jeLok.get(e.lok) ?? 0) + e.nettoMw);
    const jahr = Number(String(e.ibn).slice(0, 4));
    if (Number.isFinite(jahr) && jahr >= zubauAb) {
      jeJahr.set(jahr, (jeJahr.get(jahr) ?? 0) + e.nettoMw);
    }
  }
  const sortiert = [...jeLok.values()].sort((a, b) => b - a);
  const top = sortiert.slice(0, topN);
  const topNettoMw = top.reduce((s, v) => s + v, 0);
  const zubauJahre = [...jeJahr.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([jahr, mw]) => ({ jahr, nettoMw: mw }));
  const zubauMw = zubauJahre.reduce((s, z) => s + z.nettoMw, 0);
  return {
    nettoMw,
    lokationen: jeLok.size,
    topLokationen: top.length,
    topNettoMw,
    topAnteilPct: nettoMw > 0 ? (topNettoMw / nettoMw) * 100 : 0,
    topMinMw: top.length > 0 ? top[top.length - 1]! : 0,
    zubauJahre,
    zubauAnteilPct: nettoMw > 0 ? (zubauMw / nettoMw) * 100 : 0,
  };
}
