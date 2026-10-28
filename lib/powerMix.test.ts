import { findFirstUnixSecondForBerlinDateKey } from "@/lib/berlinCalendar";
import { buildPowerBoard } from "@/lib/powerBoard";
import {
  aggregateSlots,
  parsePowerPayload,
  periodFigures,
  residualMw,
  SURPLUS_DAY_GWH,
} from "@/lib/powerMix";
import { uniqueQuarterLabels } from "@/lib/quarterMarks";

function v2(rows: Array<Record<string, number | null>>) {
  return {
    data: rows.map((values, index) => ({
      timestamp: new Date(Date.parse("2026-10-27T00:00:00+01:00") + index * 900_000).toISOString(),
      values,
    })),
  };
}

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

describe("power mix", () => {
  it("sums published generation and load and does not turn a gap into zero", () => {
    const parsed = parsePowerPayload(
      v2([
        base,
        { ...base, wind_onshore: null, solar: null },
      ])
    );
    expect(parsed).not.toBeNull();
    const slots = parsed!.slots;
    expect(slots[1].carriers.windOnshore).toBeNull();
    expect(slots[1].carriers.solar).toBeNull();
    expect(residualMw(slots[1], true)).toBeNull();
    expect(slots[0].carriers.windOnshore).toBe(4_000);
    expect(slots[0].carriers.hydro).toBe(550);
    expect(slots[0].carriers.other).toBe(30);
    const figures = periodFigures(slots, true);
    expect(figures.carrierGwh.windOnshore).toBeCloseTo((4_000 * 0.25) / 1000, 6);
    expect(figures.carrierGwh.solar).toBeCloseTo((2_000 * 0.25) / 1000, 6);
    expect(figures.loadGwh).toBeCloseTo((20_000 * 0.25) / 1000, 6);
    expect(figures.windSolarGwh).toBeCloseTo((7_000 * 0.25) / 1000, 6);
    expect(figures.tradeGwh).toBeCloseTo((-1_000 * 0.25) / 1000, 6);
    expect(figures.surplusGwh).toBe(0);
    expect(figures.surplusGwh).not.toBeNull();
  });

  it("keeps 100 unique time marks on the clock-change day", () => {
    const start = findFirstUnixSecondForBerlinDateKey("2026-10-25");
    const end = findFirstUnixSecondForBerlinDateKey("2026-10-26");
    const rows = [];
    for (let unix = start; unix < end; unix += 900) {
      rows.push({
        timestamp: new Date(unix * 1000).toISOString(),
        values: { ...base, load_incl_self_consumption: 40_000, wind_onshore: 5_000, wind_offshore: 1_000, solar: 0 },
      });
    }
    const parsed = parsePowerPayload({ data: rows });
    expect(parsed?.slots).toHaveLength(100);
    const labels = uniqueQuarterLabels(parsed!.slots.map((slot) => slot.timestampIso));
    expect(new Set(labels).size).toBe(100);
    const two = labels.filter((label) => label.startsWith("02:00"));
    expect(two).toHaveLength(2);
    expect(two[0]).not.toBe(two[1]);
    const week = aggregateSlots(parsed!.slots, "woche", true);
    const weekLabels = week.map((point) => point.label);
    expect(new Set(weekLabels).size).toBe(weekLabels.length);
  });

  it("writes a quiet-day finding whose numbers are the table strings", () => {
    const parsed = parsePowerPayload(v2([base, base, base, base]));
    const board = buildPowerBoard({
      slots: parsed!.slots,
      offshorePresent: true,
      range: "tag",
      endDate: parsed!.slots[0].dateBerlin,
      todayKey: "2026-10-28",
      path: "/",
      fleet: { powerGw: 4, energyGwh: 8 },
      stale: false,
      tag: null,
    });
    expect(board.quiet).not.toBeNull();
    const sentence = board.quiet!.de.join(" ");
    const value = (id: string) => board.rows.find((entry) => entry.id === id)!.value.de;
    expect(sentence).toContain(value("load"));
    expect(sentence).toContain(value("windSolar"));
    expect(sentence).toContain(value("share"));
    expect(sentence).toContain(value("residualMax").split(" · ")[0]);
    expect(sentence).toContain(value("residualMax").split(" · ")[1]);
    expect(sentence).toContain(value("residualMin").split(" · ")[0]);
    expect(board.quiet!.de[1]).toContain("nichts zu laden");
    expect(value("load")).not.toBe("0");
    expect(SURPLUS_DAY_GWH).toBe(0.05);
  });
});
