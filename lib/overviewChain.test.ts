import { evaluateOverview } from "@/lib/overviewChain";
import { overviewBounds } from "@/lib/overviewRange";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";
import type { PowerSlot } from "@/lib/powerMix";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import { MORE_STORAGE_ROUND_TRIP } from "@/lib/moreStorage";
import { CHAIN_SOC_MIN, CHAIN_SOC_MAX } from "@/lib/chainedFleetSoc";

function residualSlot(date: string, hour: number, load: number, wind: number, solar: number): ResidualSlot {
  return {
    timestampIso: `${date}T${String(hour).padStart(2, "0")}:00:00+01:00`,
    hourBerlin: hour,
    minuteBerlin: 0,
    loadMw: load,
    windMw: wind,
    solarMw: solar,
  };
}

function powerSlot(date: string, hour: number, load: number, wind: number, solar: number, trade: number | null): PowerSlot {
  return {
    unixSeconds: Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00+01:00`) / 1000,
    timestampIso: `${date}T${String(hour).padStart(2, "0")}:00:00+01:00`,
    dateBerlin: date,
    hourBerlin: hour,
    minuteBerlin: 0,
    loadMw: load,
    tradeMw: trade,
    renewableSharePct: null,
    carriers: {
      lignite: null,
      hardCoal: null,
      gas: null,
      biomass: null,
      hydro: null,
      windOffshore: null,
      windOnshore: wind,
      solar,
      other: null,
    },
  };
}

describe("evaluateOverview", () => {
  const day: ResidualDay = {
    dateBerlin: "2026-10-27",
    slots: [
      residualSlot("2026-10-27", 12, 10_000, 12_000, 500),
      residualSlot("2026-10-27", 18, 20_000, 2_000, 0),
    ],
  };
  const slots = [
    powerSlot("2026-10-27", 12, 10_000, 12_000, 500, 1000),
    powerSlot("2026-10-27", 18, 20_000, 2_000, 0, 500),
  ];

  it("keeps absorbed energy within surplus and soc inside 10–90 %", () => {
    const bounds = overviewBounds("gestern", "2026-10-28");
    bounds.startKey = "2026-10-27";
    bounds.endKey = "2026-10-27";
    const result = evaluateOverview({
      bounds,
      slots,
      offshorePresent: true,
      days: [day],
      powerMw: 5000,
      energyMwh: 8000,
      prices: [],
      lastSurplusDateBerlin: "2026-10-27",
      todayKey: "2026-10-28",
    });
    const x1 = result.factors[1];
    expect(x1.absorbedGwh).toBeLessThanOrEqual((result.observed.surplusGwh ?? x1.absorbedGwh) + 1e-6);
    expect(x1.dischargedGwh).toBeLessThanOrEqual(x1.absorbedGwh * MORE_STORAGE_ROUND_TRIP + 1e-3);
    for (const point of x1.quarterPoints) {
      expect(point.socFraction).toBeGreaterThanOrEqual(CHAIN_SOC_MIN - 1e-6);
      expect(point.socFraction).toBeLessThanOrEqual(CHAIN_SOC_MAX + 1e-6);
    }
  });

  it("increases absorbed energy monotonically across factors", () => {
    const bounds = overviewBounds("gestern", "2026-10-28");
    bounds.startKey = "2026-10-27";
    bounds.endKey = "2026-10-27";
    const result = evaluateOverview({
      bounds,
      slots,
      offshorePresent: true,
      days: [day],
      powerMw: 5000,
      energyMwh: 8000,
      prices: [],
      lastSurplusDateBerlin: null,
      todayKey: "2026-10-28",
    });
    const absorbed = LIVE_DISPATCH_FACTORS.map((factor) => result.factors[factor].absorbedGwh);
    for (let index = 1; index < absorbed.length; index += 1) {
      expect(absorbed[index]).toBeGreaterThanOrEqual(absorbed[index - 1] - 1e-6);
    }
  });

  it("exposes eurModelX1 only for factor 1 when every charge or discharge quarter has a price", () => {
    const bounds = overviewBounds("gestern", "2026-10-28");
    bounds.startKey = "2026-10-27";
    bounds.endKey = "2026-10-27";
    const prices = Array.from({ length: 24 }, (_, hour) => ({
      unixMs: Date.parse(`2026-10-27T${String(hour).padStart(2, "0")}:00:00+01:00`),
      eurPerMwh: 50,
    }));
    const result = evaluateOverview({
      bounds,
      slots,
      offshorePresent: true,
      days: [day],
      powerMw: 1000,
      energyMwh: 2000,
      prices,
      lastSurplusDateBerlin: null,
      todayKey: "2026-10-28",
    });
    expect(result.factors[1].eurModelX1).not.toBeNull();
    expect(result.factors[2].eurModelX1).toBeNull();
    expect(result.factors[5].eurModelX1).toBeNull();
    expect(result.factors[10].eurModelX1).toBeNull();
  });

  it("reports zero absorption on days without surplus", () => {
    const calm: ResidualDay = {
      dateBerlin: "2026-10-29",
      slots: [residualSlot("2026-10-29", 12, 40_000, 5_000, 1_000)],
    };
    const calmSlots = [powerSlot("2026-10-29", 12, 40_000, 5_000, 1_000, 2000)];
    const bounds = overviewBounds("gestern", "2026-10-30");
    bounds.startKey = "2026-10-29";
    bounds.endKey = "2026-10-29";
    const result = evaluateOverview({
      bounds,
      slots: calmSlots,
      offshorePresent: true,
      days: [calm],
      powerMw: 4000,
      energyMwh: 8000,
      prices: [],
      lastSurplusDateBerlin: "2026-10-27",
      todayKey: "2026-10-30",
    });
    expect(result.observed.surplusGwh ?? 0).toBeLessThan(0.001);
    expect(result.factors[1].absorbedGwh).toBe(0);
    expect(result.factors[1].zeroReason).toBe("no_surplus");
    expect(result.factors[10].saturated).toBe(false);
  });

  it("does not mark saturation without observed surplus", () => {
    const bounds = overviewBounds("gestern", "2026-10-30");
    bounds.startKey = "2026-10-29";
    bounds.endKey = "2026-10-29";
    const calm: ResidualDay = {
      dateBerlin: "2026-10-29",
      slots: [residualSlot("2026-10-29", 12, 40_000, 5_000, 1_000)],
    };
    const calmSlots = [powerSlot("2026-10-29", 12, 40_000, 5_000, 1_000, 2000)];
    const result = evaluateOverview({
      bounds,
      slots: calmSlots,
      offshorePresent: true,
      days: [calm],
      powerMw: 40_000,
      energyMwh: 80_000,
      prices: [],
      lastSurplusDateBerlin: null,
      todayKey: "2026-10-30",
    });
    expect(result.factors[10].saturated).toBe(false);
  });

  it("tracks socMaxFraction at least socEndFraction on surplus days", () => {
    const bounds = overviewBounds("gestern", "2026-10-28");
    bounds.startKey = "2026-10-27";
    bounds.endKey = "2026-10-27";
    const result = evaluateOverview({
      bounds,
      slots,
      offshorePresent: true,
      days: [day],
      powerMw: 5000,
      energyMwh: 8000,
      prices: [],
      lastSurplusDateBerlin: "2026-10-27",
      todayKey: "2026-10-28",
    });
    const row = result.factors[1].dayRows[0];
    expect(row.socMaxFraction).toBeGreaterThanOrEqual(row.socEndFraction - 1e-6);
    if ((result.observed.surplusGwh ?? 0) > 0.05) {
      expect(row.socMaxFraction).toBeGreaterThan(0.2);
    }
  });
});
