/**
 * @jest-environment node
 */
import { existsSync } from "node:fs";

import { formatDeEur } from "@/lib/displayUnitFormat";
import {
  dayAheadRevenueSourcePath,
  formatTagRevenueEur,
  loadTagFahrweisenErloese,
  missingRevenueHint,
  peakMinusMarketPct,
} from "@/lib/tagFahrweisenErloese";

describe("tagFahrweisenErloese", () => {
  it("rechnet die Differenz Spitze minus Markt in Euro und Prozent", () => {
    expect(peakMinusMarketPct(90, 100)).toBeCloseTo(-10, 8);
    expect(peakMinusMarketPct(110, 100)).toBeCloseTo(10, 8);
    expect(peakMinusMarketPct(10, 0)).toBeNull();
  });

  it("nimmt Euro und Durchsatz nur aus der Wochen-Datei", () => {
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
    expect(missingRevenueHint(view)).toBe("");
  });

  it("erfindet keine Euro, wenn die Wochen-Datei fehlt", () => {
    const view = loadTagFahrweisenErloese("2026-11-01");
    expect(view.isolatedDayHorizon).toBe(false);
    expect(view.rows.every((row) => row.revenueEur == null)).toBe(true);
    expect(view.peakMinusMarketEur).toBeNull();
    const hint = missingRevenueHint(view);
    expect(hint).toContain("data/auffaelligkeit-woche/tage/2026-11-01.json");
    expect(hint).toContain("auffaelligkeit-woche/1");
    expect(hint).toMatch(/Keine selbst gerechneten Euro/);
  });

  it("setzt geschütztes Leerzeichen vor dem Euro-Zeichen", () => {
    expect(formatDeEur(1234, 0)).toBe("1.234\u00a0€");
    expect(formatTagRevenueEur(12.5)).toBe("12,50\u00a0€");
  });
});
