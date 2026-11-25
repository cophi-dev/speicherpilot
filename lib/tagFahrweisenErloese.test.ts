/**
 * @jest-environment node
 */
import { existsSync } from "node:fs";

import { formatDeEur } from "@/lib/displayUnitFormat";
import {
  dayAheadRevenueSourcePath,
  formatTagRevenueDelta,
  formatTagRevenueEur,
  formatThroughputLine,
  loadTagFahrweisenErloese,
  missingRevenueHint,
  readerMissingRevenueHint,
  peakMinusMarketPct,
} from "@/lib/tagFahrweisenErloese";

describe("tagFahrweisenErloese", () => {
  it("rechnet die Differenz Spitze minus Markt in Euro und Prozent", () => {
    expect(peakMinusMarketPct(90, 100)).toBeCloseTo(-10, 8);
    expect(peakMinusMarketPct(110, 100)).toBeCloseTo(10, 8);
    expect(peakMinusMarketPct(10, 0)).toBeNull();
  });

  it("nimmt Euro, Durchsatz und Voraussicht-Grenze nur aus der Wochen-Datei", () => {
    const path = dayAheadRevenueSourcePath("2026-11-24");
    expect(path).toBe("data/auffaelligkeit-woche/tage/2026-11-24.json");
    expect(existsSync(path)).toBe(true);
    const view = loadTagFahrweisenErloese("2026-11-24");
    expect(view.isolatedDayHorizon).toBe(true);
    expect(view.rows).toHaveLength(3);
    const spitze = view.rows.find((r) => r.strategy === "spitze");
    const markt = view.rows.find((r) => r.strategy === "markt");
    const ueb = view.rows.find((r) => r.strategy === "ueberschuss");
    expect(spitze?.revenueEur).toBeCloseTo(920502.03, 2);
    expect(markt?.revenueEur).toBeCloseTo(964694.89, 2);
    expect(ueb?.revenueEur).toBe(0);
    expect(view.peakMinusMarketEur).toBeCloseTo(-44192.86, 2);
    expect(view.peakMinusMarketPct).toBeCloseTo(-4.58, 2);
    expect(spitze?.chargeGwh).toBeCloseTo(14.1481, 3);
    expect(view.grenzeDe).toMatch(
      /Untergrenze: Das Modell kennt Höhe und Zeitpunkt der Tagesspitze im Voraus/,
    );
    expect(view.grenzeDe).toContain("mindestens 44.193 € (4,6 %, Modellschätzung)");
    expect(view.grenzeDe).not.toMatch(/Abendspitze|Reserve-SoC|Modellverlusts/);
    expect(missingRevenueHint(view)).toBe("");
    expect(readerMissingRevenueHint(view)).toBe("");
    const delta = formatTagRevenueDelta(view);
    expect(delta).toMatch(/44.193\u00a0€/);
    expect(delta).toMatch(/Erlös 4,6\u00a0% unter Markt/);
    expect(delta).not.toMatch(/−4,6/);
    expect(formatThroughputLine(spitze!)).toBe("14,15 → 12,03\u00a0GWh, Verlust 2,12");
    expect(formatThroughputLine(spitze!)).not.toMatch(/Differenz |Round-Trip-Verlust|geladen /);
  });

  it("erfindet keine Euro, wenn die Wochen-Datei fehlt, und zeigt Lesern keinen internen Pfad", () => {
    const view = loadTagFahrweisenErloese("2026-11-01");
    expect(view.isolatedDayHorizon).toBe(false);
    expect(view.rows.every((row) => row.revenueEur == null)).toBe(true);
    expect(view.peakMinusMarketEur).toBeNull();
    expect(view.grenzeDe).toBeNull();
    const hint = missingRevenueHint(view);
    expect(hint).toContain("data/auffaelligkeit-woche/tage/2026-11-01.json");
    expect(hint).toContain("auffaelligkeit-woche/1");
    expect(hint).toMatch(/Keine selbst gerechneten Euro/);
    expect(readerMissingRevenueHint(view)).toBe("Erlöse für diesen Tag folgen.");
    expect(readerMissingRevenueHint(view)).not.toMatch(/Speicherpilot muss|Schema /);
  });

  it("setzt geschütztes Leerzeichen vor dem Euro-Zeichen", () => {
    expect(formatDeEur(1234, 0)).toBe("1.234\u00a0€");
    expect(formatTagRevenueEur(12.5)).toBe("12,50\u00a0€");
  });
});
