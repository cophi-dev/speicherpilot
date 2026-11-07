import { findFirstUnixSecondForBerlinDateKey, prevBerlinDateKey } from "@/lib/berlinCalendar";
import { buildHomeDayPanelData } from "@/lib/homeDayPanel";
import { overviewBounds } from "@/lib/overviewRange";
import { parsePowerPayload, residualDaysFromSlots } from "@/lib/powerMix";

const FLEET = {
  powerMw: 4637.86022,
  energyMwh: 8139.2508,
  powerGw: 4.63786022,
  energyGwh: 8.1392508,
  updatedLabel: { de: "07.11.2026", en: "2026-11-07" },
  source: "battery-charts" as const,
  href: "https://battery-charts.de/de/battery-charts-de/",
};

const base = {
  wind_onshore: 4_000,
  wind_offshore: 1_000,
  solar: 2_000,
  fossil_brown_coal_lignite: 3_000,
  fossil_hard_coal: 1_000,
  fossil_gas: 2_000,
  biomass: 500,
  hydro_run_of_river: 400,
  hydro_water_reservoir: 100,
  hydro_pumped_storage: 50,
  fossil_oil: 10,
  others: 20,
  load_incl_self_consumption: 10_000,
  cross_border_electricity_trading: -500,
  renewable_share_of_load: 40,
};

function fullDay(dateKey: string, count: number) {
  const start = findFirstUnixSecondForBerlinDateKey(dateKey);
  const rows = [];
  for (let q = 0; q < count; q += 1) {
    rows.push({ timestamp: new Date((start + q * 900) * 1000).toISOString(), values: { ...base } });
  }
  return rows;
}

describe("buildHomeDayPanelData model availability", () => {
  it("disables model when a whole day is missing inside the simulation span", () => {
    const endKey = "2026-11-06";
    const prev = prevBerlinDateKey(endKey);
    const prev2 = prevBerlinDateKey(prev);
    const parsed = parsePowerPayload({ data: [...fullDay(prev2, 96), ...fullDay(endKey, 96)] });
    const days = residualDaysFromSlots(parsed!);
    const day = days.find((d) => d.dateBerlin === endKey)!;
    const panel = buildHomeDayPanelData({
      dateKey: endKey,
      slots: parsed!.slots,
      offshorePresent: true,
      allDays: days,
      day,
      fleet: FLEET,
      fetchStand: "test",
      fleetProvenance: "battery-charts-live",
      evaluationWindow: overviewBounds("30tage", endKey),
    });
    expect(panel?.model.available).toBe(false);
  });
});
