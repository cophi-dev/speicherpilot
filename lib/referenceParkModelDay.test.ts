import { readFileSync } from "node:fs";

import { BESS_DISPATCH_INITIAL_SOC_FRAC } from "@/lib/bessDispatchSimulator";
import type { DayAheadPricePoint } from "@/lib/dayAheadPrices";
import { kwRadius, socRingGeometry } from "@/lib/dayRingScale";
import { quarterCenterForHour, smoothPolarSamples, taperRingSamples } from "@/lib/dayRingSmooth";
import {
  dispatchReferencePark,
  referenceParkBandLimits,
  referenceParkConnectionUse,
  referenceParkModelDay,
  referenceParkRingKw,
} from "@/lib/referenceParkModelDay";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";

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
    expect(result?.params.efficiency).toBe(ROUND_TRIP_EFFICIENCY);
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

  it("does not charge a full battery and does not spend that opening inventory", () => {
    const result = dispatchReferencePark({ prices: spread(), dateBerlin: DAY, initialSocFrac: 1 });
    expect(result?.quarters.every((quarter) => quarter.powerMw >= -1e-6)).toBe(true);
    const start = result?.params.energyMWh ?? 0;
    const end = result?.quarters.at(-1)?.socMwh ?? 0;
    expect(end).toBeGreaterThanOrEqual(start - 1e-6);
    expect(result?.quarters.every((quarter) => Math.abs(quarter.powerMw) < 1e-6)).toBe(true);
  });

  it("ends at or above the opening state of charge", () => {
    const result = dispatchReferencePark({ prices: spread(), dateBerlin: DAY });
    const start = BESS_DISPATCH_INITIAL_SOC_FRAC * (result?.params.energyMWh ?? 0);
    const end = result?.quarters.at(-1)?.socMwh ?? 0;
    expect(end).toBeGreaterThanOrEqual(start - 1e-6);
    const stored = (result?.quarters ?? []).reduce((sum, quarter, index, all) => {
      const previous = index === 0 ? start : all[index - 1]!.socMwh;
      return sum + Math.max(0, quarter.socMwh - previous);
    }, 0);
    const drawn = (result?.quarters ?? []).reduce((sum, quarter, index, all) => {
      const previous = index === 0 ? start : all[index - 1]!.socMwh;
      return sum + Math.max(0, previous - quarter.socMwh);
    }, 0);
    expect(drawn).toBeLessThanOrEqual(stored + 1e-6);
  });

  it("reads the shared efficiency and does not hardcode one", () => {
    const source = readFileSync("lib/referenceParkModelDay.ts", "utf8");
    expect(source).not.toMatch(/0\.92|0\.85/);
    expect(source).toContain("ROUND_TRIP_EFFICIENCY");
    const engine = readFileSync("lib/bessDispatchSimulator.ts", "utf8");
    expect(engine).not.toContain("BESS_DISPATCH_ROUND_TRIP_EFFICIENCY");
  });

  it("measures model-day peaks against the published nameplate only", () => {
    const view = referenceParkModelDay({ prices: spread(), dateBerlin: DAY });
    const use = referenceParkConnectionUse(view?.points ?? [], 103.5);
    expect(use.maxChargeMw).toBeGreaterThan(0);
    expect(use.maxDischargeMw).toBeGreaterThan(0);
    expect(use.maxChargeMw).toBeLessThanOrEqual(103.5 + 1e-6);
    expect(use.maxDischargeMw).toBeLessThanOrEqual(103.5 + 1e-6);
    expect(referenceParkConnectionUse([], 103.5)).toEqual({
      maxChargeMw: 0,
      maxDischargeMw: 0,
      chargeAtNameplate: false,
      dischargeAtNameplate: false,
    });
  });

  it("holds still when every price is equal", () => {
    const result = dispatchReferencePark({ prices: quarters(() => 80), dateBerlin: DAY });
    expect(result?.quarters.every((quarter) => Math.abs(quarter.powerMw) < 1e-6)).toBe(true);
    expect(result?.economics.grossRevenueEur).toBe(0);
    const start = result?.quarters[0]?.socMwh;
    expect(result?.quarters.every((quarter) => quarter.socMwh === start)).toBe(true);
  });

  it("keeps every band radius outside the centre boundary", () => {
    const limits = referenceParkBandLimits();
    const center = socRingGeometry("kW").innerEdge;
    expect(limits.center).toBe(center);
    expect(limits.inner).toBeGreaterThan(center);
    expect(kwRadius(referenceParkRingKw(103.5, 103.5))).toBeCloseTo(limits.outer, 5);
    expect(kwRadius(referenceParkRingKw(-103.5, 103.5))).toBeCloseTo(limits.inner, 5);
    expect(kwRadius(referenceParkRingKw(0, 103.5))).toBeCloseTo(limits.zero, 5);

    const day = referenceParkModelDay({ prices: spread(), dateBerlin: DAY });
    const zero = kwRadius(0);
    const series = (day?.points ?? []).map((point) => ({
      angleDeg: quarterCenterForHour(point.hour),
      value: point.ohneMw,
    }));
    const samples = taperRingSamples(smoothPolarSamples(series, kwRadius, zero), zero);
    expect(samples.length).toBeGreaterThan(0);
    for (const sample of samples) {
      expect(sample.radius).toBeGreaterThanOrEqual(limits.center);
      expect(sample.radius).toBeGreaterThanOrEqual(limits.inner - 0.05);
      expect(sample.radius).toBeLessThanOrEqual(limits.outer + 0.05);
    }
  });

  it("gives an isolated nameplate quarter the full band, still outside the centre", () => {
    const limits = referenceParkBandLimits();
    const zero = kwRadius(0);
    const hours = Array.from({ length: 96 }, (_, index) => index / 4);
    const draw = hours.map((hour) => {
      if (hour === 12) return referenceParkRingKw(-103.5, 103.5);
      if (hour === 18.5) return referenceParkRingKw(103.5, 103.5);
      return 0;
    });
    const series = hours.map((hour, index) => ({
      angleDeg: quarterCenterForHour(hour),
      value: draw[index] ?? 0,
    }));
    const samples = taperRingSamples(smoothPolarSamples(series, kwRadius, zero), zero);
    expect(samples.length).toBeGreaterThan(0);
    for (const sample of samples) {
      expect(sample.radius).toBeGreaterThanOrEqual(limits.center);
      expect(sample.radius).toBeGreaterThanOrEqual(limits.inner - 0.05);
    }
    const nearest = (hour: number) =>
      samples.reduce((best, sample) =>
        Math.abs(sample.angleDeg - quarterCenterForHour(hour)) < Math.abs(best.angleDeg - quarterCenterForHour(hour)) ? sample : best
      );
    expect(nearest(12).radius).toBeCloseTo(limits.inner, 4);
    expect(nearest(18.5).radius).toBeCloseTo(limits.outer, 4);
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
