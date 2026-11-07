import { findFirstUnixSecondForBerlinDateKey } from "@/lib/berlinCalendar";
import { chainFleetSoc } from "@/lib/chainedFleetSoc";
import { buildHomeDayPanelData, totalGenerationGwhForDay } from "@/lib/homeDayPanel";
import { overviewBounds } from "@/lib/overviewRange";
import {
  parsePowerPayload,
  periodFigures,
  residualDaysFromSlots,
  slotsInRange,
} from "@/lib/powerMix";
import { buildTagesKennzahlRecords } from "@/lib/auffaelligkeitRecords";

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

function dstFallDayPayload() {
  const start = findFirstUnixSecondForBerlinDateKey("2026-10-25");
  const end = findFirstUnixSecondForBerlinDateKey("2026-10-26");
  const rows = [];
  for (let unix = start; unix < end; unix += 900) {
    rows.push({
      timestamp: new Date(unix * 1000).toISOString(),
      values: { ...base },
    });
  }
  return { data: rows };
}

function weekOfPayload(endKey: string, days: number) {
  const end = findFirstUnixSecondForBerlinDateKey(endKey);
  const rows = [];
  for (let d = days - 1; d >= 0; d -= 1) {
    const dayStart = end - d * 86_400;
    for (let q = 0; q < 96; q += 1) {
      rows.push({
        timestamp: new Date((dayStart + q * 900) * 1000).toISOString(),
        values: {
          ...base,
          wind_onshore: 5_000 + q * 10,
          solar: q < 40 ? 3_000 : 0,
          load_incl_self_consumption: 9_000,
        },
      });
    }
  }
  return { data: rows };
}

describe("totalGenerationGwhForDay", () => {
  it("equals sum of disjoint carrier energies without double counting", () => {
    const parsed = parsePowerPayload(dstFallDayPayload());
    expect(parsed?.slots).toHaveLength(100);
    const daySlots = slotsInRange(parsed!.slots, "2026-10-25", "2026-10-25");
    const gen = totalGenerationGwhForDay(daySlots, true);
    expect(gen.status).toBe("ok");
    const figures = periodFigures(daySlots, true);
    const carrierSum = Object.values(figures.carrierGwh).reduce<number>((acc, v) => acc + (v ?? 0), 0);
    expect(gen.gwh).toBeCloseTo(carrierSum, 5);
    expect(figures.windSolarGwh).not.toBeNull();
    expect((figures.windSolarGwh as number) < (gen.gwh as number)).toBe(true);
  });

  it("returns partial when a carrier is missing on any quarter", () => {
    const parsed = parsePowerPayload(dstFallDayPayload());
    const daySlots = slotsInRange(parsed!.slots, "2026-10-25", "2026-10-25");
    daySlots[10] = {
      ...daySlots[10],
      carriers: { ...daySlots[10].carriers, gas: null },
    };
    const gen = totalGenerationGwhForDay(daySlots, true);
    expect(gen.status).toBe("partial");
    expect(gen.gwh).toBeNull();
  });
});

describe("buildHomeDayPanelData", () => {
  it("matches chained charge to TagesKennzahl records on a full week", () => {
    const parsed = parsePowerPayload(weekOfPayload("2026-11-06", 14));
    const days = residualDaysFromSlots(parsed!);
    const dayKey = "2026-11-06";
    const day = days.find((d) => d.dateBerlin === dayKey);
    expect(day).toBeTruthy();
    const records = buildTagesKennzahlRecords({
      days,
      slots: parsed!.slots,
      offshorePresent: true,
      prices: [],
      powerMw: FLEET.powerMw,
      energyMwh: FLEET.energyMwh,
    });
    const record = records.find((r) => r.dateKey === dayKey);
    expect(record).toBeTruthy();
    const panel = buildHomeDayPanelData({
      dateKey: dayKey,
      todayKey: "2026-11-07",
      slots: parsed!.slots,
      offshorePresent: true,
      allDays: days,
      day: day!,
      fleet: FLEET,
      fetchStand: "test",
      modelWindow: overviewBounds("30tage", "2026-11-07"),
    });
    expect(panel?.referenceComplete).toBe(true);
    expect(panel?.model.chargedGwh).toBeCloseTo(record!.absorbedGwh, 5);
    const run = chainFleetSoc(
      days.filter((d) => d.dateBerlin <= dayKey),
      FLEET.powerMw,
      FLEET.energyMwh
    );
    let chargedMwh = 0;
    for (const p of run.points) {
      if (p.dateBerlin === dayKey) {
        chargedMwh += p.chargeMw * 0.25;
      }
    }
    expect(panel?.model.chargedGwh).toBeCloseTo(chargedMwh / 1000, 5);
    expect(panel?.observed.surplusGwh).toBeCloseTo(record!.surplusGwh, 5);
  });
});
