import { BESS_DISPATCH_ROUND_TRIP_EFFICIENCY } from "@/lib/bessDispatchSimulator";
import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { dispatchReferencePark, referenceParkModelDay } from "@/lib/referenceParkModelDay";

const DAY = "2026-10-22";

function quarters(value: (hour: number) => number): DayAheadPricePoint[] {
  const start = Date.parse(`${DAY}T00:00:00+02:00`);
  return Array.from({ length: 96 }, (_, index) => ({
    unixMs: start + index * 15 * 60 * 1000,
    eurPerMwh: value(Math.floor(index / 4)),
  }));
}

const spread = () => quarters((hour) => (hour < 10 ? 20 : hour < 17 ? 50 : 180));

describe("Bollingstedt model day", () => {
  it("runs the park on a price spread and keeps the engine efficiency and SoC window", () => {
    const result = dispatchReferencePark({ prices: spread(), dateBerlin: DAY });
    expect(result).not.toBeNull();
    expect(result?.params.efficiency).toBe(BESS_DISPATCH_ROUND_TRIP_EFFICIENCY);
    expect(result?.params.powerMW).toBe(103.5);
    expect(result?.params.energyMWh).toBe(238.5);
    expect(result?.quarters.some((quarter) => quarter.powerMw < 0)).toBe(true);
    expect(result?.quarters.some((quarter) => quarter.powerMw > 0)).toBe(true);
    for (const quarter of result?.quarters ?? []) {
      expect(quarter.socPct).toBeGreaterThanOrEqual(10 - 1e-3);
      expect(quarter.socPct).toBeLessThanOrEqual(90 + 1e-3);
    }
    const view = referenceParkModelDay({ prices: spread(), dateBerlin: DAY });
    expect(JSON.stringify(view)).not.toMatch(/€|eur/i);
  });

  it("does not discharge an empty battery", () => {
    const result = dispatchReferencePark({ prices: spread(), dateBerlin: DAY, initialSocFrac: 0 });
    expect(result?.quarters.every((quarter) => quarter.powerMw <= 1e-6)).toBe(true);
    expect(result?.quarters.some((quarter) => quarter.powerMw < -1e-3)).toBe(true);
  });

  it("does not charge a full battery", () => {
    const result = dispatchReferencePark({ prices: spread(), dateBerlin: DAY, initialSocFrac: 1 });
    expect(result?.quarters.every((quarter) => quarter.powerMw >= -1e-6)).toBe(true);
    expect(result?.quarters.some((quarter) => quarter.powerMw > 1e-3)).toBe(true);
  });

  it("holds still when every price is equal", () => {
    const result = dispatchReferencePark({ prices: quarters(() => 80), dateBerlin: DAY });
    expect(result?.quarters.every((quarter) => Math.abs(quarter.powerMw) < 1e-6)).toBe(true);
    expect(result?.economics.grossRevenueEur).toBe(0);
    const start = result?.quarters[0]?.socMwh;
    expect(result?.quarters.every((quarter) => quarter.socMwh === start)).toBe(true);
  });

  it("expands an hourly price series into quarter-hours", () => {
    const start = Date.parse(`${DAY}T00:00:00+02:00`);
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      unixMs: start + hour * 60 * 60 * 1000,
      eurPerMwh: hour < 12 ? 15 : 120,
    }));
    const day = referenceParkModelDay({ prices: hourly, dateBerlin: DAY });
    expect(day?.points).toHaveLength(96);
  });
});
