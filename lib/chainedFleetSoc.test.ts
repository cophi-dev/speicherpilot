import { chainFleetSoc, CHAIN_SOC_MAX, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";
import { MORE_STORAGE_ROUND_TRIP } from "@/lib/moreStorage";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

function slot(date: string, hour: number, minute: number, loadMw: number, windMw: number, solarMw: number): ResidualSlot {
  return {
    timestampIso: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+01:00`,
    hourBerlin: hour,
    minuteBerlin: minute,
    loadMw,
    windMw,
    solarMw,
  };
}

describe("chained fleet state of charge", () => {
  it("stays inside 10–90 % and balances at 85 % round-trip", () => {
    const energyMwh = 1_000;
    const powerMw = 1_000;
    const day: ResidualDay = {
      dateBerlin: "2026-10-27",
      slots: [
        slot("2026-10-27", 12, 0, 10_000, 10_200, 200),
        slot("2026-10-27", 18, 0, 20_000, 1_000, 0),
      ],
    };
    const run = chainFleetSoc([day], powerMw, energyMwh);
    expect(run.startSocMwh).toBeCloseTo(CHAIN_SOC_MIN * energyMwh, 6);
    for (const point of run.points) {
      expect(point.soc).toBeGreaterThanOrEqual(CHAIN_SOC_MIN - 1e-9);
      expect(point.soc).toBeLessThanOrEqual(CHAIN_SOC_MAX + 1e-9);
    }
    const end = run.startSocMwh + run.chargedMwh - run.dischargedMwh / MORE_STORAGE_ROUND_TRIP;
    expect(end).toBeCloseTo(run.endSocMwh, 4);
    expect(run.chargedMwh).toBeGreaterThan(0);
    expect(run.dischargedMwh).toBeGreaterThan(0);
  });

  it("carries the state into the next day and does not fill past 90 %", () => {
    const energyMwh = 100;
    const powerMw = 10_000;
    const monday: ResidualDay = {
      dateBerlin: "2026-10-26",
      slots: [slot("2026-10-26", 11, 0, 0, 50_000, 50_000)],
    };
    const tuesday: ResidualDay = {
      dateBerlin: "2026-10-27",
      slots: [slot("2026-10-27", 11, 0, 1_000, 0, 0)],
    };
    const run = chainFleetSoc([tuesday, monday], powerMw, energyMwh);
    expect(run.points[0].soc).toBeCloseTo(CHAIN_SOC_MAX, 6);
    expect(run.points[1].soc).toBeCloseTo(CHAIN_SOC_MAX, 6);
    expect(run.points[0].dateBerlin).toBe("2026-10-26");
  });

  it("does not charge when wind and solar stay under load", () => {
    const day: ResidualDay = {
      dateBerlin: "2026-10-27",
      slots: [slot("2026-10-27", 12, 0, 40_000, 5_000, 1_000), slot("2026-10-27", 18, 0, 50_000, 4_000, 0)],
    };
    const run = chainFleetSoc([day], 4_000, 8_000);
    expect(run.chargedMwh).toBe(0);
    expect(run.dischargedMwh).toBe(0);
    expect(run.endSocMwh).toBeCloseTo(0.1 * 8_000, 6);
  });
});
