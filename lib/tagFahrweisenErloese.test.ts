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
import { TAG_DAY_AHEAD_REVENUE_FIELD } from "@/lib/nationalMonthFleetModel.server";

describe("tagFahrweisenErloese", () => {
  it("rechnet die Differenz Spitze minus Markt in Euro und Prozent", () => {
    expect(peakMinusMarketPct(90, 100)).toBeCloseTo(-10, 8);
    expect(peakMinusMarketPct(110, 100)).toBeCloseTo(10, 8);
    expect(peakMinusMarketPct(10, 0)).toBeNull();
  });

  it("bindet den Erlös an dayAheadRevenueEur in der ×1-Tagesdatei", () => {
    const path = dayAheadRevenueSourcePath("2026-11-23", "spitze");
    expect(path).toBe(
      "data/national-fleet/2026-11/days/2026-11-23/x1_min_peak_perfect_foresight.json",
    );
    expect(TAG_DAY_AHEAD_REVENUE_FIELD).toBe("dayAheadRevenueEur");
    expect(existsSync(path)).toBe(true);
  });

  it("erfindet keine Euro, wenn das Feld fehlt", () => {
    const view = loadTagFahrweisenErloese("2026-11-23");
    expect(view.isolatedDayHorizon).toBe(true);
    expect(view.rows).toHaveLength(3);
    expect(view.rows.every((row) => row.revenueEur == null)).toBe(true);
    expect(view.peakMinusMarketEur).toBeNull();
    expect(view.peakMinusMarketPct).toBeNull();
    const hint = missingRevenueHint(view);
    expect(hint).toContain("dayAheadRevenueEur");
    expect(hint).toContain("x1_min_peak_perfect_foresight.json");
    expect(hint).toContain("x1_price_oriented_da_arbitrage.json");
    expect(hint).toContain("x1_surplus_wind_solar_over_load.json");
    expect(hint).toMatch(/Keine selbst gerechneten Euro/);
    expect(view.rows[0]?.chargeGwh).not.toBeNull();
    expect(view.rows[0]?.dischargeGwh).not.toBeNull();
  });

  it("setzt geschütztes Leerzeichen vor dem Euro-Zeichen", () => {
    expect(formatDeEur(1234, 0)).toBe("1.234\u00a0€");
    expect(formatTagRevenueEur(12.5)).toBe("12,50\u00a0€");
  });
});
